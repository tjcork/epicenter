<script>
  import { Button } from '@repo/ui/button';
  import { onMount } from 'svelte';
  
  let platform = $state('');
  let downloadUrl = $state('');
  let downloadText = $state('Download');
  
  onMount(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const appVersion = navigator.appVersion.toLowerCase();
    
    if (userAgent.includes('mac') || appVersion.includes('mac')) {
      // Check for Apple Silicon
      if (userAgent.includes('arm') || navigator.userAgent.includes('Apple')) {
        platform = 'macOS (Apple Silicon)';
        downloadUrl = 'https://github.com/epicenter-so/epicenter/releases/latest/download/Whispering_7.1.1_aarch64.dmg';
        downloadText = 'Download for macOS';
      } else {
        platform = 'macOS (Intel)';
        downloadUrl = 'https://github.com/epicenter-so/epicenter/releases/latest/download/Whispering_7.1.1_x64.dmg';
        downloadText = 'Download for macOS';
      }
    } else if (userAgent.includes('win')) {
      platform = 'Windows';
      downloadUrl = 'https://github.com/epicenter-so/epicenter/releases/latest/download/Whispering_7.1.1_x64_en-US.msi';
      downloadText = 'Download for Windows';
    } else if (userAgent.includes('linux')) {
      platform = 'Linux';
      // For Linux, we'll redirect to releases page since there's no direct download
      downloadUrl = 'https://github.com/epicenter-so/epicenter/releases';
      downloadText = 'Download for Linux';
    } else {
      // Default to releases page
      downloadUrl = 'https://github.com/epicenter-so/epicenter/releases';
      downloadText = 'Download';
    }
  });
</script>

<Button href={downloadUrl} size="lg" class="w-full sm:w-auto min-w-[200px] min-h-[48px] shadow-lg hover:shadow-xl transition-all group font-semibold">
  <svg class="w-5 h-5 mr-2 group-hover:translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
  </svg>
  {downloadText}
</Button>