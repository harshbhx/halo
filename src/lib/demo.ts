/** Demo mode with synthetic sample people. Filled in by the demo-mode slice. */
export const SAMPLE_AVAILABLE = false;

export async function loadSamplePeople(): Promise<number> {
  throw new Error('Sample people are not available yet');
}

export async function createDemoStream(): Promise<{ stream: MediaStream; stop: () => void }> {
  throw new Error('The demo camera is not available yet');
}
