<script setup>
defineProps({
  show: Boolean,
})

defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
    <Transition name="fade-sheet">
      <div v-if="show" class="fixed inset-0 z-40 bg-black/20" @click="$emit('close')" />
    </Transition>
    <Transition name="slide-up">
      <div v-if="show" class="fixed bottom-0 left-0 right-0 z-50 bg-sand-light rounded-t-3xl shadow-lg max-h-[80vh] overflow-y-auto">
        <div class="flex justify-center pt-3 pb-1">
          <div class="w-10 h-1 bg-ocean-deep/20 rounded-full" />
        </div>
        <div class="px-6 pb-8">
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-sheet-enter-active,
.fade-sheet-leave-active {
  transition: opacity 0.3s ease;
}
.fade-sheet-enter-from,
.fade-sheet-leave-to {
  opacity: 0;
}

.slide-up-enter-active {
  transition: transform 0.3s ease-out;
}
.slide-up-leave-active {
  transition: transform 0.2s ease-in;
}
.slide-up-enter-from {
  transform: translateY(100%);
}
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>
