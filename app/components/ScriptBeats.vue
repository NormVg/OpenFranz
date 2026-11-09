<script setup lang="ts">
import type { ScriptBeatSegment } from "~~/shared/utils/script-block";

type Beat = {
  time: string;
  segments: ScriptBeatSegment[];
};

defineProps<{
  beats: Beat[];
}>();
</script>

<template>
  <div class="beats">
    <div v-for="(beat, index) in beats" :key="index" class="beat">
      <span class="beat-time">{{ beat.time }}</span>
      <span class="beat-node" aria-hidden="true" />
      <div class="beat-segments">
        <div
          v-for="(segment, segIndex) in beat.segments"
          :key="segIndex"
          class="beat-segment"
          :class="{ 'beat-segment--raw': !segment.label }"
        >
          <span v-if="segment.label" class="beat-label">
            {{ segment.label }}
          </span>
          <span class="beat-value">{{ segment.value }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * Timeline layout: a monospace time column, one node column carrying the
 * rail dots, and a two-column segment grid whose labels align vertically
 * across every beat. The rail is drawn once on the container so the gaps
 * between beats never break the line.
 */
.beats {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.beats::before {
  content: "";
  position: absolute;
  top: 6px;
  bottom: 6px;
  left: 70px;
  width: 1px;
  background: color-mix(in oklab, var(--border) 80%, transparent);
}

.beat {
  display: grid;
  grid-template-columns: 56px 28px minmax(0, 1fr);
  animation: beat-in 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.beat-time {
  font-family: var(--font-mono);
  font-size: 11.5px;
  line-height: 1.45;
  color: var(--muted-foreground);
  text-align: right;
  white-space: nowrap;
}

.beat-node {
  width: 7px;
  height: 7px;
  margin-top: 4px;
  justify-self: center;
  border: 1px solid color-mix(in oklab, var(--foreground) 30%, transparent);
  border-radius: 2px;
  background: var(--card);
}

.beat-segments {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 3px 0;
  align-content: start;
}

.beat-segment {
  display: contents;
}

.beat-segment--raw .beat-value {
  grid-column: 1 / -1;
}

.beat-label {
  padding-top: 3px;
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.07em;
  color: var(--muted-foreground);
  text-transform: uppercase;
}

.beat-value {
  min-width: 0;
  font-size: 13.5px;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

@keyframes beat-in {
  from {
    opacity: 0;
    transform: translateY(3px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .beat {
    animation: none;
  }
}
</style>
