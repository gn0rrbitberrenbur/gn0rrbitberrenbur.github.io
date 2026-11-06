<script lang="ts">
  import GomokuGame from '#lib/GomokuGame.svelte';
</script>

<svelte:head>
  <title>Moku</title>
</svelte:head>

<div class="page">
  <GomokuGame />
</div>

<style>
  .page {
    max-width: 1200px;
    margin: 2rem auto;
    padding: 0 1rem;
  }
</style>