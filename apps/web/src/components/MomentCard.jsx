import { useMemo } from 'react';
import { BookOpen, Check, ChevronDown, ChevronUp, CircleAlert, Flame, ShieldCheck } from 'lucide-react';
import { buildSubtitleCues } from '@gospelviral/shared';
import { timestampToSeconds } from '../lib/helpers.js';
import { extractSegmentLines } from '../lib/transcript-extract.js';
import CardTabs from './CardTabs.jsx';
import CopyAllButton from './CopyAllButton.jsx';
import CopyButton from './CopyButton.jsx';
import ScoreBar from './ScoreBar.jsx';
import SubtitlePreview from './SubtitlePreview.jsx';

const PURPOSE_COLOR = {
  evangelization: '#B95D3F',
  edification: '#3F6BB9',
  hybrid: '#7A6A4F',
};

const PURPOSE_LABEL = {
  evangelization: 'Evangelização',
  edification: 'Edificação',
  hybrid: 'Híbrido',
};

const THEOLOGY_CHECKS = [
  { key: 'christ_centered', label: 'Centrado em Cristo' },
  { key: 'scripture_based', label: 'Baseado nas Escrituras' },
  { key: 'grace_focused', label: 'Foco na graça' },
  { key: 'hope_present', label: 'Esperança presente' },
  { key: 'authentic', label: 'Autêntico' },
];

const SCORE_BARS = [
  { key: 'emotional_resonance', label: 'Ressonância emocional' },
  { key: 'information_value', label: 'Valor informação' },
  { key: 'story_quality', label: 'Qualidade história' },
  { key: 'shareability', label: 'Compartilhabilidade' },
  { key: 'controversy_potential', label: 'Controvérsia' },
  { key: 'hook_strength', label: 'Força hook' },
];

function readScore(moment, key) {
  const dim = moment.score_breakdown?.[key];
  if (typeof dim === 'object' && dim !== null) return dim.score || 0;
  return dim || 0;
}

function hasActiveRedFlag(moment) {
  const flags = moment.theological_check?.red_flags;
  return Array.isArray(flags) && flags.length > 0 && flags[0] !== 'nenhuma';
}

function isColdOpen(moment) {
  return (
    moment.cold_open === true || moment.cold_open_analysis?.decision === 'apply_cold_open'
  );
}

function PurposeBadge({ purpose }) {
  const color = PURPOSE_COLOR[purpose] || '#3F3F3F';
  const label = PURPOSE_LABEL[purpose] || purpose;
  return (
    <span
      className="text-[10px] font-semibold tracking-[0.15em] uppercase px-2 py-0.5 rounded-sm text-white"
      style={{ backgroundColor: color, fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {label}
    </span>
  );
}

function MomentHeader({ moment, index, purposeColor }) {
  return (
    <div className="px-6 py-5 border-b border-stone-200 flex items-start justify-between flex-wrap gap-3">
      <div className="flex items-baseline gap-4">
        <div
          className="text-4xl italic font-light text-stone-300"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          #{String(index + 1).padStart(2, '0')}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <PurposeBadge purpose={moment.content_purpose} />
            {isColdOpen(moment) && (
              <span
                className="text-[10px] font-semibold tracking-[0.15em] uppercase px-2 py-0.5 rounded-sm bg-stone-900 text-stone-50 inline-flex items-center gap-1"
                style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
              >
                <Flame size={10} /> Cold open
              </span>
            )}
            {hasActiveRedFlag(moment) && (
              <span
                className="text-[10px] font-semibold tracking-[0.15em] uppercase px-2 py-0.5 rounded-sm bg-red-700 text-white inline-flex items-center gap-1"
                style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
              >
                <CircleAlert size={10} /> Red flag
              </span>
            )}
          </div>
          <div
            className="text-xs text-stone-500"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {moment.timestamp_start} → {moment.timestamp_end} · {moment.duration_seconds}s
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-baseline gap-2">
          <span
            className="text-3xl font-light tabular-nums"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            {moment.viral_score?.toFixed(1)}
          </span>
          <span
            className="text-xs text-stone-500 tracking-widest uppercase"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            viral score
          </span>
        </div>
        <CopyAllButton moment={moment} />
        <span data-testid="purpose-color" hidden>
          {purposeColor}
        </span>
      </div>
    </div>
  );
}

function ScriptureBox({ scripture }) {
  if (!scripture) return null;
  return (
    <div className="border-l-2 pl-4 py-1" style={{ borderColor: '#F4C04A' }}>
      <div
        className="text-[10px] uppercase tracking-[0.15em] text-stone-400 mb-1"
        style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
      >
        <BookOpen size={10} className="inline mr-1" />
        {scripture.reference}
      </div>
      <p
        className="text-sm italic text-stone-700 leading-relaxed"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        {'"'}
        {scripture.text}
        {'"'}
      </p>
      <p
        className="text-[10px] text-stone-400 mt-1"
        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
      >
        exibir {scripture.when_to_display}
      </p>
    </div>
  );
}

function TheologyChecklist({ check }) {
  return (
    <div className="pt-3 mt-3 border-t border-stone-200">
      <div
        className="text-[10px] uppercase tracking-[0.15em] text-stone-400 mb-2"
        style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
      >
        <ShieldCheck size={10} className="inline mr-1" />
        Checagem teológica
      </div>
      <div
        className="grid grid-cols-2 gap-1.5 text-xs"
        style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
      >
        {THEOLOGY_CHECKS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-1.5 text-stone-700">
            {check?.[key] ? (
              <Check size={12} className="text-emerald-700" />
            ) : (
              <CircleAlert size={12} className="text-red-700" />
            )}
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function RedesSociaisTabBody({ moment }) {
  return (
    <div className="space-y-5">
      <div>
        <div
          className="text-[10px] uppercase tracking-[0.15em] text-stone-400 mb-1.5 flex items-center justify-between"
          style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          <span>Legenda do post · {moment.caption?.structure_used}</span>
          <CopyButton text={moment.caption?.text || ''} label="Copiar" />
        </div>
        <div className="bg-stone-50 p-4 rounded-sm border border-stone-200">
          <p
            className="text-sm leading-relaxed whitespace-pre-line text-stone-800"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            {moment.caption?.text}
          </p>
        </div>
      </div>

      <div>
        <div
          className="text-[10px] uppercase tracking-[0.15em] text-stone-400 mb-1.5 flex items-center justify-between"
          style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          <span>Hashtags</span>
          <CopyButton text={moment.hashtags?.all || ''} label="Copiar" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(moment.hashtags?.all || '')
            .split(' ')
            .filter(Boolean)
            .map((tag, i) => (
              <span
                key={`${tag}-${i}`}
                className="text-xs px-2 py-0.5 bg-stone-100 border border-stone-200 rounded-sm text-stone-700"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                {tag}
              </span>
            ))}
        </div>
      </div>

      <div>
        <div
          className="text-[10px] uppercase tracking-[0.15em] text-stone-400 mb-1.5 flex items-center justify-between"
          style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          <span>Call to action</span>
          <CopyButton text={moment.cta?.primary || ''} label="Copiar" />
        </div>
        <p
          className="text-sm font-medium text-stone-900"
          style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          {'"'}
          {moment.cta?.primary}
          {'"'}
        </p>
      </div>
    </div>
  );
}

function LegendaVideoTabBody({ segmentLines }) {
  if (segmentLines.length === 0) {
    return (
      <p
        className="text-sm text-stone-500 italic"
        style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
      >
        Transcript indisponível para este trecho.
      </p>
    );
  }
  const copyText = segmentLines.join('\n');
  return (
    <div className="space-y-2">
      <div
        className="text-[10px] uppercase tracking-[0.15em] text-stone-400 mb-1.5 flex items-center justify-between"
        style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
      >
        <span>Texto falado · uma linha por cue</span>
        <CopyButton text={copyText} label="Copiar" />
      </div>
      <div
        className="bg-stone-50 p-4 rounded-sm border border-stone-200 space-y-2"
        style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
      >
        {segmentLines.map((line, i) => (
          <p key={i} className="text-sm leading-relaxed text-stone-800">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

function ScoreDetails({ moment, purposeColor }) {
  return (
    <details className="group">
      <summary
        className="text-[10px] uppercase tracking-[0.15em] text-stone-400 cursor-pointer flex items-center gap-1.5 hover:text-stone-900 transition-colors list-none"
        style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
      >
        <ChevronDown size={12} className="group-open:hidden" />
        <ChevronUp size={12} className="hidden group-open:block" />
        Score breakdown · theological check
      </summary>
      <div className="mt-3 space-y-2.5 pt-3 border-t border-stone-200">
        {SCORE_BARS.map(({ key, label }) => (
          <ScoreBar
            key={key}
            label={label}
            score={readScore(moment, key)}
            accent={purposeColor}
          />
        ))}
        <TheologyChecklist check={moment.theological_check} />
        {moment.viral_reasoning && (
          <div className="pt-3 mt-3 border-t border-stone-200">
            <div
              className="text-[10px] uppercase tracking-[0.15em] text-stone-400 mb-1.5"
              style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              Por que viral
            </div>
            <p
              className="text-xs leading-relaxed text-stone-600"
              style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              {moment.viral_reasoning}
            </p>
          </div>
        )}
      </div>
    </details>
  );
}

export default function MomentCard({
  moment,
  videoId,
  subtitleConfig,
  videoConfig,
  overlayConfig,
  onVideoConfigChange,
  onSubtitleConfigChange,
  transcript = '',
  activeCardTab = 'redes-sociais',
  onActiveCardTabChange,
  videoSource = null,
  mode = 'edit',
  isActivePlayer = false,
  onRequestPlay,
  onPlaybackEnd,
  index,
}) {
  const startSec = timestampToSeconds(moment.timestamp_start);
  const purposeColor = PURPOSE_COLOR[moment.content_purpose] || '#3F3F3F';

  // The Legenda tab (reading) and the player cues (timed display) are distinct
  // concepts that coincide today — kept as separate memos by design.
  const segmentLines = useMemo(
    () => extractSegmentLines(transcript, moment.timestamp_start, moment.timestamp_end),
    [transcript, moment.timestamp_start, moment.timestamp_end],
  );
  const cues = useMemo(
    () => buildSubtitleCues(transcript, moment.timestamp_start, moment.timestamp_end),
    [transcript, moment.timestamp_start, moment.timestamp_end],
  );

  const tabs = [
    {
      id: 'redes-sociais',
      label: 'Redes Sociais',
      body: <RedesSociaisTabBody moment={moment} />,
    },
    {
      id: 'legenda-video',
      label: 'Legenda do Vídeo',
      body: <LegendaVideoTabBody segmentLines={segmentLines} />,
    },
  ];

  return (
    <article className="bg-white border border-stone-200 rounded-sm overflow-hidden">
      <MomentHeader moment={moment} index={index} purposeColor={purposeColor} />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6">
        <div className="md:col-span-5 min-w-0">
          <div
            className="canvas-width-only mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.15em] text-stone-400"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            <span>Preview · 9:16</span>
            <a
              href={`https://youtube.com/watch?v=${videoId}&t=${startSec}s`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-stone-900 transition-colors normal-case tracking-normal"
            >
              ver no YouTube ↗
            </a>
          </div>
          <SubtitlePreview
            videoId={videoId}
            moment={moment}
            subtitleConfig={subtitleConfig}
            videoConfig={videoConfig}
            overlayConfig={overlayConfig}
            onVideoConfigChange={onVideoConfigChange}
            onSubtitleConfigChange={onSubtitleConfigChange}
            videoSource={videoSource}
            cues={cues}
            mode={mode}
            isActivePlayer={isActivePlayer}
            onRequestPlay={onRequestPlay}
            onPlaybackEnd={onPlaybackEnd}
          />
        </div>

        <div className="md:col-span-7 min-w-0 space-y-5">
          <div>
            <div
              className="text-[10px] uppercase tracking-[0.15em] text-stone-400 mb-1.5 flex items-center justify-between"
              style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              <span>Hook</span>
              <CopyButton text={moment.hook_title} label="Copiar" />
            </div>
            <h2
              className="text-2xl leading-snug"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              {moment.hook_title}
            </h2>
          </div>

          <ScriptureBox scripture={moment.key_scripture} />

          <CardTabs
            activeTab={activeCardTab}
            onActiveTabChange={onActiveCardTabChange}
            tabs={tabs}
          />

          <ScoreDetails moment={moment} purposeColor={purposeColor} />
        </div>
      </div>
    </article>
  );
}
