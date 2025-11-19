import { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { MODEL_IDS } from '../constants';
import { floatTo16BitPCM, base64EncodeAudio, base64ToArrayBuffer, createWavBlob } from '../services/audioUtils';

interface UseGeminiLiveProps {
  onTranscription: (text: string, isUser: boolean) => void;
  onAudioData: (audioUrl: string) => void;
}

export const useGeminiLive = ({ onTranscription, onAudioData }: UseGeminiLiveProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  
  // Visualizer handling
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsConnected(false);
    setIsSpeaking(false);
    setVolumeLevel(0);
    audioChunksRef.current = [];
  }, []);

  const connect = async () => {
    setError(null);
    try {
      if (!process.env.API_KEY) {
         // In a real scenario, we might need to handle the missing key gracefully or ask user
         // For this template, we assume it's injected or we show an error
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Setup Audio Context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000, // Gemini Output Sample Rate
      });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        autoGainControl: true,
        noiseSuppression: true
      }});

      // Analyser for visualization
      const audioCtx = audioContextRef.current;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      // Establish Live Session
      const sessionPromise = ai.live.connect({
        model: MODEL_IDS.live,
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            audioChunksRef.current = [];
            
            // Setup Input Stream
            const inputCtx = new AudioContext({ sampleRate: 16000 });
            const source = inputCtx.createMediaStreamSource(stream);
            
            // For visualization of input
            const inputAnalyser = inputCtx.createAnalyser();
            inputAnalyser.fftSize = 256;
            source.connect(inputAnalyser);
            
            // Visualize Input Volume
            const dataArray = new Uint8Array(inputAnalyser.frequencyBinCount);
            const updateVolume = () => {
                inputAnalyser.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
                setVolumeLevel(avg);
                animationFrameRef.current = requestAnimationFrame(updateVolume);
            };
            updateVolume();

            // Processor for streaming to API
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcm16 = floatTo16BitPCM(inputData);
              const base64 = base64EncodeAudio(pcm16);
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({
                  media: {
                    mimeType: 'audio/pcm;rate=16000',
                    data: base64
                  }
                });
              });
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
            
            inputSourceRef.current = source;
            processorRef.current = processor;
            sessionRef.current = sessionPromise;
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Handle Audio Output
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              setIsSpeaking(true);
              const arrayBuffer = base64ToArrayBuffer(audioData);
              
              // Decode raw PCM
              const int16 = new Int16Array(arrayBuffer);
              const float32 = new Float32Array(int16.length);
              for(let i=0; i<int16.length; i++) {
                float32[i] = int16[i] / 32768.0;
              }

              // Accumulate audio chunks for download
              audioChunksRef.current.push(float32);
              
              const buffer = audioContextRef.current!.createBuffer(1, float32.length, 24000);
              buffer.getChannelData(0).set(float32);
              
              const source = audioContextRef.current!.createBufferSource();
              source.buffer = buffer;
              source.connect(audioContextRef.current!.destination);
              
              // Schedule Playback
              const currentTime = audioContextRef.current!.currentTime;
              const startTime = Math.max(currentTime, nextStartTimeRef.current);
              source.start(startTime);
              nextStartTimeRef.current = startTime + buffer.duration;

              source.onended = () => {
                if (audioContextRef.current && audioContextRef.current.currentTime >= nextStartTimeRef.current) {
                    setIsSpeaking(false);
                }
              };
            }

            // Handle Transcriptions (Log to chat history)
            if (msg.serverContent?.outputTranscription?.text) {
               onTranscription(msg.serverContent.outputTranscription.text, false);
            }
            if (msg.serverContent?.inputTranscription?.text) {
               onTranscription(msg.serverContent.inputTranscription.text, true);
            }
            
            // Handle Turn Complete
            if (msg.serverContent?.turnComplete) {
               setIsSpeaking(false);
               // Process accumulated audio chunks into a Blob URL
               if (audioChunksRef.current.length > 0) {
                   const totalLength = audioChunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
                   const merged = new Float32Array(totalLength);
                   let offset = 0;
                   for (const chunk of audioChunksRef.current) {
                       merged.set(chunk, offset);
                       offset += chunk.length;
                   }
                   // Create WAV (24kHz mono)
                   const blob = createWavBlob(merged, 24000);
                   const url = URL.createObjectURL(blob);
                   onAudioData(url);
                   
                   // Clear chunks for next turn
                   audioChunksRef.current = [];
               }
            }
          },
          onclose: () => {
            setIsConnected(false);
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setError("Connection interrupted.");
            cleanup();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {}, 
          outputAudioTranscription: {},
          systemInstruction: "You are a helpful Bengali assistant. Always answer in Bengali language."
        }
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect");
      cleanup();
    }
  };

  const disconnect = () => {
    if (sessionRef.current) {
        sessionRef.current.then((s:any) => s.close());
    }
    cleanup();
  };

  return {
    isConnected,
    isSpeaking,
    error,
    volumeLevel,
    connect,
    disconnect
  };
};