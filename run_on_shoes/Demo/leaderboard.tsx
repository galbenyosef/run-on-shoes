import { useState } from 'react';
import { ArrowUpRight, RotateCcw, Trophy } from 'lucide-react';
import {
  normalizeUsername,
  type LeaderboardView,
  type RunScore,
} from '../API/leaderboard.ts';

type Props = {
  score: RunScore;
  leaderboard: LeaderboardView | null;
  loading: boolean;
  submitting: boolean;
  submitted: boolean;
  notice: string;
  error: string;
  initialUsername: string;
  onSubmit: (username: string) => void;
  onRefresh: () => void;
  onRestart: () => void;
  onOverview: () => void;
};

export default function LeaderboardResult(props: Props) {
  const [username, setUsername] = useState(props.initialUsername);
  const [skipped, setSkipped] = useState(false);
  const [validationError, setValidationError] = useState('');
  const personal = props.leaderboard?.personal;
  return (
    <div className="modal-shade result-shade">
      <dialog
        open
        className="game-modal result-modal"
        aria-labelledby="result-title"
      >
        <div className="result-summary">
          <span className="eyebrow">EXPEDITION COMPLETE</span>
          <h2 id="result-title">每一步，都算数。</h2>
          <div className="result-time">
            {(props.score.timeMs / 1000).toFixed(1)}
            <span>秒</span>
          </div>
          <p>
            躲过 {props.score.dodged} 次袭击 · 角色比例 1:{props.score.ratio}
          </p>
        </div>
        {!skipped && !props.submitted && (
          <form
            className="score-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (props.submitting) return;
              try {
                const normalized = normalizeUsername(username);
                setValidationError('');
                props.onSubmit(normalized);
              } catch (error) {
                setValidationError(
                  error instanceof Error ? error.message : '请检查用户名。',
                );
              }
            }}
          >
            <label htmlFor="leaderboard-username">
              填写用户名，留下你的最好成绩
            </label>
            <div className="score-form-row">
              <input
                id="leaderboard-username"
                value={username}
                autoComplete="username"
                placeholder="用户名（最多 24 个字符）"
                maxLength={48}
                disabled={props.submitting}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setValidationError('');
                }}
                aria-describedby="score-sharing-note"
                aria-invalid={!!validationError}
              />
              <button
                type="submit"
                className="score-submit"
                disabled={props.submitting}
              >
                {props.submitting ? '正在提交…' : '提交成绩'}
              </button>
            </div>
            <p id="score-sharing-note">
              提交后，用户名和成绩将公开展示。同一浏览器保留个人最好成绩，也可以跳过。
            </p>
            <button
              type="button"
              className="text-button"
              disabled={props.submitting}
              onClick={() => {
                setValidationError('');
                setSkipped(true);
              }}
            >
              跳过填写，查看排行榜
            </button>
          </form>
        )}
        {(validationError || props.error) && (
          <p className="leaderboard-error" role="alert">
            {validationError || props.error}
          </p>
        )}
        {props.notice && (
          <output className="leaderboard-notice">{props.notice}</output>
        )}
        <section
          className="leaderboard-panel"
          aria-label="全球排行榜"
          aria-busy={props.loading}
        >
          <div className="leaderboard-heading">
            <h3>
              <Trophy size={17} />
              排行榜 · TOP 10
            </h3>
            <button
              type="button"
              onClick={props.onRefresh}
              disabled={props.loading || props.submitting}
            >
              {props.loading ? '加载中…' : '刷新'}
            </button>
          </div>
          <p className="leaderboard-rule">
            每位玩家保留最好成绩 · 同时长比较躲避次数和距离
          </p>
          {!props.leaderboard ? (
            <p className="leaderboard-empty">
              {props.loading
                ? '正在读取排行榜…'
                : '暂时无法读取排行榜，请重试。'}
            </p>
          ) : props.leaderboard.top.length === 0 ? (
            <p className="leaderboard-empty">
              还没有成绩，成为第一位上榜玩家。
            </p>
          ) : (
            <div className="leaderboard-table-wrap">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th scope="col">名次</th>
                    <th scope="col">玩家</th>
                    <th scope="col">生存时长</th>
                    <th scope="col">躲避</th>
                  </tr>
                </thead>
                <tbody>
                  {props.leaderboard.top.map((entry) => (
                    <tr
                      key={entry.playerId}
                      className={
                        entry.playerId === personal?.playerId
                          ? 'is-personal'
                          : ''
                      }
                    >
                      <td>{entry.rank.toString().padStart(2, '0')}</td>
                      <td>
                        <span>{entry.username}</span>
                        {entry.playerId === personal?.playerId && (
                          <small>你</small>
                        )}
                      </td>
                      <td>{(entry.timeMs / 1000).toFixed(1)} 秒</td>
                      <td>{entry.dodged}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="personal-rank" aria-live="polite">
            <span>你的名次</span>
            {personal ? (
              <>
                <strong>第 {personal.rank} 名</strong>
                <span>
                  {personal.username} · {(personal.timeMs / 1000).toFixed(1)} 秒
                  / 共 {props.leaderboard?.totalPlayers} 人
                </span>
              </>
            ) : (
              <span>
                {props.submitted ? '等待排行榜更新' : '提交成绩后显示'}
              </span>
            )}
          </div>
        </section>
        <div className="result-actions">
          <button
            type="button"
            className="start-button"
            disabled={props.submitting}
            onClick={props.onRestart}
          >
            <RotateCcw size={17} />
            再次出发
            <ArrowUpRight size={20} />
          </button>
          <button
            type="button"
            className="text-button"
            disabled={props.submitting}
            onClick={props.onOverview}
          >
            返回鞋子全景
          </button>
        </div>
      </dialog>
    </div>
  );
}
