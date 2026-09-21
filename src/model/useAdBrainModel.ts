import { useCallback, useEffect, useRef, useState } from 'react';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { initLlama, releaseAllLlama } from 'llama.rn';
import { ADBRAIN_MODEL } from './modelConfig';

type ModelStatus = 'checking' | 'downloading' | 'loading' | 'ready' | 'error';

type ChatTurn = {
  role: 'user' | 'assistant';
  content: string;
};

const SYSTEM_PROMPT = [
  'You are AdBrain One, a local-first ecommerce marketing assistant.',
  'You help users understand products, customers, reviews, positioning, offers, ad angles, hooks, UGC scripts, landing page messaging, objections and creative strategy.',
  'Never use canned answers. Respond specifically to the current request and provided data.',
  'If information is missing, say what is missing and ask only the minimum useful question.',
  'When reviews are provided, ground conclusions in repeated customer language and clearly separate evidence from inference.',
  'Keep answers structured, practical and easy to understand.',
  'Prefer concise headings and actionable outputs.',
  'Do not claim an ad will win. Treat recommendations as hypotheses to test.',
].join(' ');

const STOP_WORDS = [
  '</s>',
  '<|end|>',
  '<|eot_id|>',
  '<|end_of_text|>',
  '<|im_end|>',
  '<|EOT|>',
  '<|END_OF_TURN_TOKEN|>',
  '<|end_of_turn|>',
  '<|endoftext|>',
];

export function useAdBrainModel() {
  const contextRef = useRef<Awaited<ReturnType<typeof initLlama>> | null>(null);
  const historyRef = useRef<ChatTurn[]>([]);
  const mountedRef = useRef(true);

  const [status, setStatus] = useState<ModelStatus>('checking');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const modelPath = ReactNativeBlobUtil.fs.dirs.DocumentDir + '/' + ADBRAIN_MODEL.fileName;

  const initialize = useCallback(async () => {
    try {
      setError(null);
      const exists = await ReactNativeBlobUtil.fs.exists(modelPath);

      if (!exists) {
        setStatus('downloading');
        setDownloadProgress(0);

        const task = ReactNativeBlobUtil.config({
          path: modelPath,
          overwrite: true,
        })
          .fetch('GET', ADBRAIN_MODEL.url)
          .progress({ interval: 500 }, (received, total) => {
            if (!mountedRef.current || total <= 0) return;
            const pct = Math.max(0, Math.min(100, Math.round((received / total) * 100)));
            setDownloadProgress(pct);
          });

        await task;
      }

      if (!mountedRef.current) return;
      setDownloadProgress(100);
      setStatus('loading');

      await releaseAllLlama().catch(() => undefined);

      const context = await initLlama(
        {
          model: 'file://' + modelPath,
          n_ctx: 4096,
          n_batch: 256,
          n_threads: 4,
          n_gpu_layers: 0,
          use_mlock: false,
        },
        (progress) => {
          if (!mountedRef.current) return;
          if (progress >= 0 && progress <= 100) setDownloadProgress(Math.round(progress));
        },
      );

      if (!mountedRef.current) {
        await releaseAllLlama().catch(() => undefined);
        return;
      }

      contextRef.current = context;
      setStatus('ready');
      setError(null);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      contextRef.current = null;
      setStatus('error');
      setError(message || 'Unknown local model error');
    }
  }, [modelPath]);

  useEffect(() => {
    mountedRef.current = true;
    void initialize();

    return () => {
      mountedRef.current = false;
    };
  }, [initialize]);

  const ask = useCallback(async (message: string, onToken?: (token: string) => void) => {
    const context = contextRef.current;
    if (!context || status !== 'ready') {
      throw new Error('AdBrain One is not ready yet.');
    }

    const recent = historyRef.current.slice(-8);
    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...recent,
      { role: 'user' as const, content: message },
    ];

    const result = await context.completion(
      {
        messages,
        n_predict: 520,
        temperature: 0.55,
        top_k: 40,
        top_p: 0.9,
        penalty_repeat: 1.08,
        stop: STOP_WORDS,
        chat_template_kwargs: {
          enable_thinking: false,
        },
      },
      (data) => {
        if (data.token && onToken) onToken(data.token);
      },
    );

    const text = result.text?.trim();
    if (!text) throw new Error('AdBrain One returned an empty response.');

    historyRef.current = [
      ...recent,
      { role: 'user', content: message },
      { role: 'assistant', content: text },
    ];

    return text;
  }, [status]);

  const retry = useCallback(async () => {
    setStatus('checking');
    await initialize();
  }, [initialize]);

  const resetConversation = useCallback(() => {
    historyRef.current = [];
  }, []);

  return {
    ask,
    retry,
    resetConversation,
    status,
    isReady: status === 'ready',
    downloadProgress,
    error,
    modelName: ADBRAIN_MODEL.name,
    modelSize: ADBRAIN_MODEL.sizeLabel,
  };
}
