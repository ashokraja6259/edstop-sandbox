// FILE: src/app/ai-companion-interface/page.tsx

import type { Metadata } from 'next';
import AICompanionInteractive from './components/AICompanionInteractive';

export const metadata: Metadata = {
  title: 'AI Companion - EdStop',
  description: 'Get intelligent assistance for academic queries, campus information, and student life with AI-powered companion featuring daily question limits and premium upgrade options.',
};

export default function AICompanionPage() {
  return <AICompanionInteractive />;
}