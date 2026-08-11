import { useState, useCallback, useEffect } from 'react';

interface ProbeResult {
  format: {
    duration: string;
    format_name: string;
    size: string;
  };
  streams: Array<{
    codec_type: string;
    codec_name: string;
    width?: number;
    height?: number;
    r_frame_rate?: string;
  }>;
}

export function useFFmpeg() {
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api) return;

    const unsubscribe = api.onProgress((p: number) => {
      setProgress(p);
    });

    return unsubscribe;
  }, []);

  const probe = useCallback(async (filePath: string): Promise<ProbeResult> => {
    const api = (window as any).electronAPI;
    return api.probe(filePath);
  }, []);

  const extractFrame = useCallback(async (filePath: string, time: number): Promise<string> => {
    const api = (window as any).electronAPI;
    const base64 = await api.extractFrame(filePath, time);
    return `data:image/png;base64,${base64}`;
  }, []);

  const convert = useCallback(async (params: {
    input: string;
    output: string;
    options?: {
      codec?: string;
      crf?: number;
      bitrate?: string;
      resolution?: string;
      fps?: number;
      audioCodec?: string;
      audioBitrate?: string;
      preset?: string;
      duration?: number;
      hwaccel?: boolean;
    };
  }) => {
    const api = (window as any).electronAPI;
    setIsProcessing(true);
    setProgress(0);

    try {
      const result = await api.convert(params);
      return result;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const getWaveform = useCallback(async (filePath: string, samples: number = 1000): Promise<number[]> => {
    const api = (window as any).electronAPI;
    return api.waveform(filePath, samples);
  }, []);

  const openFile = useCallback(async () => {
    const api = (window as any).electronAPI;
    return api.openFile();
  }, []);

  const saveFile = useCallback(async () => {
    const api = (window as any).electronAPI;
    return api.saveFile();
  }, []);

  return {
    probe,
    extractFrame,
    convert,
    getWaveform,
    openFile,
    saveFile,
    progress,
    isProcessing,
  };
}
