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

      <div class="beat-segments">
        <div
          v-for="(segment, segIndex) in beat.segments"
          :key="segIndex"
          class="beat-segment"
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
.beats {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.beat {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 0 14px;
}

.beat-time {
  padding-top: 2px;
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.5;
  color: var(--muted-foreground);
  text-align: right;
  white-space: nowrap;
}

.beat-segments {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 14px;
  border-left: 1px solid color-mix(in oklab, var(--border) 70%, transparent);
}

.beat-segment {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.beat-label {
  flex-shrink: 0;
  width: 64px;
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.07em;
  color: var(--muted-foreground);
  text-transform: uppercase;
}

.beat-value {
  min-width: 0;
  font-size: 13px;
  line-height: 1.55;
  overflow-wrap: anywhere;
}
</style>
