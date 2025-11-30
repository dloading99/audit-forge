import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import { Audit, AuditStatus, Issue, PageData } from '../types';
import { ScoreGauge } from '../components/ScoreGauge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface AuditDetailProps {
  auditId: string;
}

const Tabs = ['Overview', 'Issues', 'Pages', 'Report'] as const;
type Tab = typeof Tabs[number];

export const AuditDetail: React.FC<AuditDetailProps> = ({ auditId }) => {
  const [audit, setAudit] = useState<Audit | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const timerRef = useRef<number | undefined>(undefined);

  const fetchAudit = async () => {
    const data = await api.getAudit(auditId);
    setAudit(data);
    return data?.status;
  };

  useEffect(() => {
    fetchAudit();
    timerRef.current = window.setInterval(async () => {
      const status = await fetchAudit();
      if (status === AuditStatus.COMPLETED || status === AuditStatus.FAILED) {
        window.clearInterval(timerRef.current);
      }
    }, 2000);

    return () => window.clearInterval(timerRef.current);
  }, [auditId]);

  if (!audit) return <div className="p-12 text-center text-gray-500">Loading audit data...</div>;

  if (audit.status !== AuditStatus.COMPLETED && audit.status !== AuditStatus.FAILED) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-brand-600 mb-6"></div>
        <h2 className="text-xl font-semibold text-gray-900">Audit in Progress</h2>
        <p className="text-gray-500 mt-2">We are crawling {audit.url} and analyzing design, SEO, and performance.</p>
        <p className="text-sm text-gray-400 mt-4">Status: <span className="uppercase font-medium text-brand-600">{audit.status}</span></p>
      </div>
    );
  }

  // Visualization Data Helpers
  const scoreData = [
    { name: 'SEO', score: audit.scores.seo },
    { name: 'Perf', score: audit.scores.performance },
    { name: 'A11y', score: audit.scores.accessibility },
    { name: 'Content', score: audit.scores.content },
    { name: 'UX/UI', score: audit.scores.uxDesign },
  ];

  const getColor = (score: number) => score >= 90 ? '#22c55e' : score >= 50 ? '#f97316' : '#ef4444';

  const RenderOverview = () => (
    <div className="space-y-8 animate-fade-in">
      {/* Top Scores */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <ScoreGauge score={audit.scores.overall} label="Overall" size="lg" />
        <ScoreGauge score={audit.scores.seo} label="SEO" size="sm" />
        <ScoreGauge score={audit.scores.performance} label="Performance" size="sm" />
        <ScoreGauge score={audit.scores.accessibility} label="Access" size="sm" />
        <ScoreGauge score={audit.scores.content} label="Content" size="sm" />
        <ScoreGauge score={audit.scores.uxDesign} label="UX & Design" size="sm" />
      </div>

      {/* Charts & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Score Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={40}>
                  {scoreData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getColor(entry.score)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Issue Summary</h3>
          <div className="space-y-4">
             <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
               <div className="flex items-center gap-3">
                 <div className="w-3 h-3 rounded-full bg-red-500"></div>
                 <span className="font-medium text-red-900">Critical Issues</span>
               </div>
               <span className="text-2xl font-bold text-red-600">{audit.issuesSummary.critical}</span>
             </div>
             <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-100">
               <div className="flex items-center gap-3">
                 <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                 <span className="font-medium text-orange-900">Major Issues</span>
               </div>
               <span className="text-2xl font-bold text-orange-600">{audit.issuesSummary.major}</span>
             </div>
             <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
               <div className="flex items-center gap-3">
                 <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                 <span className="font-medium text-blue-900">Minor Issues</span>
               </div>
               <span className="text-2xl font-bold text-blue-600">{audit.issuesSummary.minor}</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );

  const RenderIssues = () => {
    // Flatten all issues from all pages for a master list
    const allIssues = audit.pages.flatMap(p => p.issues.map(i => ({...i, url: p.url})));
    return (
      <div className="bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
        <ul className="divide-y divide-gray-200">
          {allIssues.length === 0 ? <li className="p-6 text-gray-500">No issues found! Great job.</li> : allIssues.map((issue) => (
            <li key={issue.id} className="p-6 hover:bg-gray-50 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                   <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase
                     ${issue.severity === 'critical' ? 'bg-red-100 text-red-800' : 
                       issue.severity === 'major' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                     {issue.severity}
                   </span>
                   <div>
                     <p className="text-sm font-medium text-gray-900">{issue.message}</p>
                     <p className="text-xs text-gray-500 mt-1">Found on: {issue.url}</p>
                     <p className="text-xs font-mono text-gray-400 mt-1">{issue.code}</p>
                   </div>
                </div>
                <div className="text-sm text-gray-500 capitalize">{issue.category}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const RenderPages = () => (
    <div className="bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issues</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {audit.pages.map((page) => (
            <tr key={page.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-600 truncate max-w-xs">{page.url}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{page.issues.length}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{page.scores.overall}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{page.statusCode}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const RenderReport = () => (
    <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
      <div className="flex justify-end mb-4 gap-2">
         <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">Copy Text</button>
         <button className="px-3 py-1 text-sm bg-brand-600 text-white border border-transparent rounded hover:bg-brand-700">Download PDF</button>
      </div>
      <div className="prose prose-blue max-w-none markdown-body">
        {/* Simple markdown rendering (in a real app, use react-markdown) */}
        {audit.reportMarkdown?.split('\n').map((line, i) => {
            if (line.startsWith('# ')) return <h1 key={i}>{line.replace('# ', '')}</h1>
            if (line.startsWith('## ')) return <h2 key={i}>{line.replace('## ', '')}</h2>
            if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-bold mt-4 mb-2">{line.replace('### ', '')}</h3>
            if (line.startsWith('* ')) return <li key={i} className="ml-4">{line.replace('* ', '')}</li>
            if (line.startsWith('- ')) return <li key={i} className="ml-4">{line.replace('- ', '')}</li>
            if (line === '---') return <hr key={i} className="my-6 border-gray-200"/>
            return <p key={i} className={line.length === 0 ? 'h-4' : ''}>{line}</p>
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Results</h1>
          <p className="text-gray-500">{audit.url}</p>
        </div>
        <div className="text-sm text-gray-400">Completed: {new Date(audit.completedAt || '').toLocaleString()}</div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {Tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`${
                activeTab === tab
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'Overview' && <RenderOverview />}
        {activeTab === 'Issues' && <RenderIssues />}
        {activeTab === 'Pages' && <RenderPages />}
        {activeTab === 'Report' && <RenderReport />}
      </div>
    </div>
  );
};