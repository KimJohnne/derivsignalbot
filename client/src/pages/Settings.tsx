import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SignalSettings from '@/components/SignalSettings';

export default function Settings() {
  return (
    <div className="flex flex-col h-screen bg-dark-blue text-text-primary">
      <Header />
      
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Signal Generator Settings</h2>
          <p className="mb-6 text-text-secondary">
            Configure how the AI trading signal generator works. Adjust the maximum number of signals, 
            interval between signal generation, and entry point logic to optimize your trading strategy.
          </p>
          
          <SignalSettings />
          
          <div className="mt-8 p-4 bg-dark-gray border border-light-gray rounded-md">
            <h3 className="text-base font-semibold mb-2">About Signal Generation</h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-text-secondary">
              <li>
                <strong>Maximum Signals:</strong> Limits the number of signals generated at one time. 
                Lower numbers focus on the most profitable opportunities.
              </li>
              <li>
                <strong>Signal Interval:</strong> Controls how frequently the system checks for new trading opportunities.
                Default is 5 minutes.
              </li>
              <li>
                <strong>Entry After Consecutive Count:</strong> For digit strategies, this determines how many consecutive
                digits of the same type (e.g., even, odd) should appear before generating a signal for the opposite type.
                Higher values may result in more accurate signals but fewer opportunities.
              </li>
            </ul>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}