import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  LeaderboardClient,
  LeaderboardView,
  RunScore,
} from '../API/leaderboard.ts';
import LeaderboardResult from './leaderboard.tsx';

type Props = {
  client: LeaderboardClient;
  runId: string;
  registration: Promise<string | null>;
  score: RunScore;
  onRestart: () => void;
  onOverview: () => void;
};

export default function OnlineLeaderboardResult(props: Props) {
  const [view, setView] = useState<LeaderboardView | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const active = useRef(true);
  const controller = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const refresh = useCallback(() => {
    if (busy.current) return;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setLoading(true);
    setError('');
    void props.client
      .read(request.signal)
      .then(
        (data) => {
          if (active.current && !request.signal.aborted) setView(data);
        },
        () => {
          if (active.current && !request.signal.aborted)
            setError('排行榜暂时无法加载，请检查网络后重试。');
        },
      )
      .finally(() => {
        if (active.current && !request.signal.aborted) setLoading(false);
      });
  }, [props.client]);
  useEffect(() => {
    active.current = true;
    refresh();
    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, [refresh]);
  const submit = async (username: string) => {
    if (busy.current || submitted) return;
    busy.current = true;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setLoading(false);
    setSubmitting(true);
    setError('');
    try {
      const registrationError = await props.registration;
      if (registrationError)
        throw new Error('本局开始时未能连接排行榜，请联网后重新开始一局。');
      if (!active.current || request.signal.aborted) return;
      const result = await props.client.submit(
        props.runId,
        username,
        props.score,
        request.signal,
      );
      if (!active.current || request.signal.aborted) return;
      setView(result);
      setSubmitted(true);
      setNotice(
        result.personal?.runId === props.runId
          ? '提交成功，你的最好成绩已更新。'
          : '提交成功，排行榜保留了你之前的最好成绩。',
      );
    } catch (error) {
      if (active.current && !request.signal.aborted)
        setError(
          error instanceof Error
            ? error.message
            : '提交失败，请检查网络后重试。',
        );
    } finally {
      busy.current = false;
      if (active.current) setSubmitting(false);
    }
  };
  return (
    <LeaderboardResult
      score={props.score}
      leaderboard={view}
      loading={loading}
      submitting={submitting}
      submitted={submitted}
      notice={notice}
      error={error}
      initialUsername={props.client.initialUsername}
      onSubmit={(username) => {
        void submit(username);
      }}
      onRefresh={refresh}
      onRestart={props.onRestart}
      onOverview={props.onOverview}
    />
  );
}
