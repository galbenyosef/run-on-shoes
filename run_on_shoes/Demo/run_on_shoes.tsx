import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ChevronRight,
  Expand,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Zap,
  Orbit,
  Move,
  Crosshair,
  Heart,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import {
  createGame,
  DEFAULT_RATIO,
  SCALE_LIMITS,
  initialSnapshot,
  type GameController,
} from '../API/run_on_shoes.ts';
const initial = initialSnapshot();
export default function RunOnShoesDemo() {
  const host = useRef<HTMLDivElement>(null),
    game = useRef<GameController | null>(null);
  const [state, setState] = useState(initial),
    [ratio, setRatio] = useState(DEFAULT_RATIO),
    [muted, setMuted] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let disposed = false;
    let session: GameController | undefined;
    void (async () => {
      if (disposed || !host.current) return;
      try {
        const g = await createGame(host.current, (snapshot) => {
          if (!disposed) setState(snapshot);
        });
        if (disposed) {
          g.dispose();
          return;
        }
        session = g;
        game.current = g;
        await g.load();
      } catch (e) {
        if (!disposed) setError('模型加载失败，请检查网络后刷新重试。');
        if (!disposed) console.error(e);
      }
    })();
    return () => {
      disposed = true;
      session?.dispose();
      if (game.current === session) game.current = null;
    };
  }, []);
  const start = () => game.current?.start();
  const changeRatio = (v: number | readonly number[]) => {
    const r = Array.isArray(v) ? v[0] : (v as number);
    setRatio(r);
    game.current?.setRatio(r);
  };
  const active = state.mode === 'playing' || state.mode === 'paused';
  return (
    <main className={'game-shell mode-' + state.mode}>
      <div ref={host} className="world" aria-label="可交互的鞋子三维世界" />
      <div className="vignette" />
      <header className="topbar">
        <a href="./" className="wordmark">
          <span className="brand-mark">
            <Orbit size={23} />
          </span>
          <span>
            MICRO<span className="thin">STRIDE</span>
            <small>微步 · 鞋面生存</small>
          </span>
        </a>
        <div className="world-label">
          <span className="live-dot" />
          01 / THE SNEAKER WORLD
        </div>
        <div className="top-actions">
          <button
            aria-label={muted ? '开启声音' : '静音'}
            onClick={() => {
              setMuted(!muted);
              game.current?.setMuted(!muted);
            }}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button
            aria-label="全屏"
            onClick={() => {
              if (document.fullscreenElement)
                void document.exitFullscreen().catch(() => {});
              else
                void document.documentElement
                  .requestFullscreen?.()
                  .catch(() => {});
            }}
          >
            <Expand size={18} />
          </button>
        </div>
      </header>
      {!active && state.mode !== 'gameover' && (
        <>
          <section className="intro">
            <div className="eyebrow">
              <span />
              SURVIVAL AT A DIFFERENT SCALE
            </div>
            <h1>
              一只鞋。
              <br />
              整个<span>世界。</span>
            </h1>
            <p className="intro-copy">
              缩小自己，踏上巨型鞋面。
              <br />
              重力缓慢转向，躲开天降的激光与陨石。
            </p>
            <div className="scale-card">
              <div className="scale-title">
                <span>你的世界比例</span>
                <strong>
                  1 <em>:</em> {ratio}
                </strong>
              </div>
              <Slider
                value={[ratio]}
                onValueChange={changeRatio}
                min={SCALE_LIMITS.min}
                max={SCALE_LIMITS.max}
                step={SCALE_LIMITS.step}
                aria-label="角色身高与鞋长比例"
              />
              <div className="scale-ends">
                <span>1:20 · 更大角色</span>
                <span>1:200 · 微观冒险</span>
              </div>
              <p>角色身高 : 鞋子长度</p>
            </div>
            <button
              className="start-button"
              disabled={!state.ready || !!error}
              onClick={start}
            >
              <Play size={17} fill="currentColor" />
              <span>{state.ready ? '进入鞋面' : '正在准备世界'}</span>
              <ArrowUpRight size={22} />
            </button>
            <output className="loading-note">
              {error ||
                (!state.ready
                  ? state.message
                  : 'WASD 移动 · 空格跳跃 · Shift 冲刺')}
            </output>
          </section>
          <div className="scene-caption">
            <span>EXPEDITION / 001</span>
            <strong>荒野机能 · 巨型地形</strong>
            <small>
              <Move size={13} />
              拖动旋转 · 滚轮缩放
            </small>
          </div>
          <div className="overview-tag">
            <Crosshair size={15} />
            <span>三维全景 / ORBIT VIEW</span>
          </div>
        </>
      )}
      {active && (
        <>
          <div className="hud-left">
            <div className="eyebrow">SURVIVAL TIME</div>
            <div className="timer">
              {Math.floor(state.time / 60)
                .toString()
                .padStart(2, '0')}
              <span>:</span>
              {Math.floor(state.time % 60)
                .toString()
                .padStart(2, '0')}
              <small>.{Math.floor((state.time % 1) * 10)}</small>
            </div>
            <div className="health">
              {[0, 1, 2].map((i) => (
                <Heart
                  key={i}
                  size={19}
                  fill={i < state.health ? 'currentColor' : 'none'}
                  className={i < state.health ? '' : 'lost'}
                />
              ))}
            </div>
            <div className="hud-stats">
              <div>
                <b>{state.dodged.toString().padStart(2, '0')}</b>
                <span>已躲避</span>
              </div>
              <div>
                <b>{Math.floor(state.distance)}</b>
                <span>移动距离</span>
              </div>
            </div>
          </div>
          <div className="wave-panel">
            <span className="live-dot" />第 {state.wave} 波
            <span className="wave-line" />
            天空袭击
            <button
              aria-label="暂停"
              onClick={() => game.current?.togglePause()}
            >
              <Pause size={15} />
            </button>
          </div>
          <div className="threat-note">{state.message}</div>
          <div className="dash-meter">
            <Zap size={16} />
            <span>冲刺</span>
            <div>
              <i style={{ width: state.dash * 100 + '%' }} />
            </div>
            <kbd>SHIFT</kbd>
          </div>
          <div className="play-scale">
            <div>
              <span>角色 / 鞋长</span>
              <strong>1:{ratio}</strong>
            </div>
            <Slider
              value={[ratio]}
              onValueChange={changeRatio}
              min={SCALE_LIMITS.min}
              max={SCALE_LIMITS.max}
              step={SCALE_LIMITS.step}
              aria-label="游戏内比例调整"
            />
          </div>
          <div className="touch-pad">
            {[
              ['w', '↑'],
              ['a', '←'],
              ['s', '↓'],
              ['d', '→'],
            ].map(([key, label]) => (
              <button
                key={key}
                className={'key-' + key}
                aria-label={label}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  game.current?.key(key, true);
                }}
                onPointerUp={() => game.current?.key(key, false)}
                onPointerCancel={() => game.current?.key(key, false)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="touch-actions">
            <button onPointerDown={() => game.current?.jump()}>跳跃</button>
            <button onPointerDown={() => game.current?.dash()}>冲刺</button>
          </div>
        </>
      )}
      {state.mode === 'paused' && (
        <div className="modal-shade">
          <section className="game-modal">
            <span className="eyebrow">TAKE A BREATH</span>
            <h2>世界已暂停</h2>
            <p>准备好了，就继续奔跑。</p>
            <button
              className="start-button"
              onClick={() => game.current?.togglePause()}
            >
              <Play size={17} />
              继续冒险
              <ChevronRight size={20} />
            </button>
            <button
              className="text-button"
              onClick={() => game.current?.overview()}
            >
              返回全景
            </button>
          </section>
        </div>
      )}
      {state.mode === 'gameover' && (
        <div className="modal-shade">
          <section className="game-modal">
            <span className="eyebrow">EXPEDITION COMPLETE</span>
            <h2>
              每一步，
              <br />
              都算数。
            </h2>
            <div className="result-time">
              {state.time.toFixed(1)}
              <span>秒</span>
            </div>
            <p>
              躲过 {state.dodged} 次袭击 · 抵达第 {state.wave} 波
            </p>
            <button className="start-button" onClick={start}>
              <RotateCcw size={18} />
              再次出发
              <ArrowUpRight size={20} />
            </button>
            <button
              className="text-button"
              onClick={() => game.current?.overview()}
            >
              返回鞋子全景
            </button>
          </section>
        </div>
      )}
      <footer>
        <div>
          <kbd>W A S D</kbd>移动 <span /> <kbd>SPACE</kbd>跳跃 <span />{' '}
          <kbd>SHIFT</kbd>冲刺 <span /> <kbd>ESC</kbd>暂停
        </div>
        <span className="footer-right">
          {active ? '拖动调整视角 · 滚轮调节距离' : '一场发生在脚下的冒险'}
          <i>✦</i>
        </span>
      </footer>
    </main>
  );
}
