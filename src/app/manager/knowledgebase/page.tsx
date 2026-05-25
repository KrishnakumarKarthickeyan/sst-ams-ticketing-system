'use client';

import React, { useState } from 'react';
import { useTickets } from '../../../context/TicketContext';
import { useAuth } from '../../../context/AuthContext';
import { Bookmark, Plus, Search, Tag, Eye } from 'lucide-react';
import Link from 'next/link';

export default function ManagerKnowledgebasePage() {
  const { kbArticles, kbCategories, createKbArticle } = useTickets();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [moduleFilter, setModuleFilter] = useState('All');
  
  // Creation form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sapModule, setSapModule] = useState<any>('FICO');
  const [categoryId, setCategoryId] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  // Initialize category selector
  React.useEffect(() => {
    if (kbCategories.length > 0 && !categoryId) {
      setCategoryId(kbCategories[0].id);
    }
  }, [kbCategories, categoryId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !user) return;

    createKbArticle({
      title,
      content,
      sapModule,
      categoryId,
      isInternal,
      authorName: user.name
    });

    setTitle('');
    setContent('');
    setIsInternal(false);
    setShowAddForm(false);
  };

  // Filter articles
  const filteredArticles = kbArticles.filter(art => {
    if (categoryFilter !== 'All' && art.categoryId !== categoryFilter) return false;
    if (moduleFilter !== 'All' && art.sapModule !== moduleFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        art.title.toLowerCase().includes(q) ||
        art.content.toLowerCase().includes(q) ||
        art.categoryName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 font-mono text-xs text-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-lg font-bold uppercase text-zinc-950 font-mono">Knowledgebase Center</h1>
          <p className="text-zinc-500 mt-1">Publish standard guides for SAP Functional teams or Internal troubleshooting wikis.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5 transition"
        >
          <Plus size={12} />
          Create Article
        </button>
      </div>

      {/* Creation form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-zinc-900 rounded p-5 max-w-xl space-y-4">
          <h3 className="font-bold text-[10px] uppercase tracking-wider text-zinc-950 border-b border-zinc-150 pb-2">
            Publish New Documentation Article
          </h3>
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 uppercase text-[9px]">Article Title</label>
            <input
              type="text"
              required
              placeholder="e.g. FICO: Adjusting accounting periods (OB52)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-955 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-zinc-700 uppercase text-[9px]">SAP Module</label>
              <select
                value={sapModule}
                onChange={(e) => setSapModule(e.target.value as any)}
                className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-955 font-mono"
              >
                <option value="FICO">FICO</option>
                <option value="MM">MM</option>
                <option value="SD">SD</option>
                <option value="PP">PP</option>
                <option value="PM">PM</option>
                <option value="QM">QM</option>
                <option value="BASIS">BASIS</option>
                <option value="ABAP">ABAP</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-bold text-zinc-700 uppercase text-[9px]">Topic Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-955 font-mono"
              >
                {kbCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-700 uppercase text-[9px]">Markdown Content</label>
            <textarea
              required
              rows={6}
              placeholder="# Step by step guide... Use standard markdown elements."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-955 font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isInternalCheck"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="rounded text-zinc-950 focus:ring-zinc-950"
            />
            <label htmlFor="isInternalCheck" className="font-bold text-zinc-700 uppercase text-[9px] select-none">
              Internal Only (Client Restricted)
            </label>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 border border-zinc-200 hover:bg-zinc-50 rounded uppercase tracking-wider text-[10px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 bg-zinc-950 text-white hover:bg-zinc-800 rounded uppercase tracking-wider text-[10px]"
            >
              Publish Article
            </button>
          </div>
        </form>
      )}

      {/* Filter and search bar */}
      <div className="bg-white border border-zinc-200 rounded p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search wikis, titles, categories..."
            className="w-full bg-white border border-zinc-200 rounded pl-9 pr-4 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-[11px] font-semibold text-zinc-800 focus:outline-none font-mono"
          >
            <option value="All">All Categories</option>
            {kbCategories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Module */}
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-[11px] font-semibold text-zinc-800 focus:outline-none font-mono"
          >
            <option value="All">All SAP Modules</option>
            <option value="FICO">FICO</option>
            <option value="MM">MM</option>
            <option value="SD">SD</option>
            <option value="PP">PP</option>
            <option value="BASIS">BASIS</option>
            <option value="ABAP">ABAP</option>
          </select>
        </div>
      </div>

      {/* Articles List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredArticles.length === 0 ? (
          <div className="col-span-2 bg-white border border-zinc-200 py-16 text-center text-zinc-400 space-y-2">
            <Bookmark className="mx-auto opacity-35" size={28} />
            <p>No articles match your selection query.</p>
          </div>
        ) : (
          filteredArticles.map(art => (
            <div key={art.id} className="bg-white border border-zinc-200 rounded-lg p-5 flex flex-col justify-between space-y-4 hover:border-zinc-950 transition">
              <div>
                <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Tag size={11} />
                    {art.categoryName}
                  </span>
                  <span className="px-1.5 py-0.2 bg-zinc-900 text-white rounded text-[9px] font-bold">
                    {art.sapModule}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-zinc-950 mt-2.5">{art.title}</h3>
                <p className="text-[11px] text-zinc-500 line-clamp-3 mt-1.5 leading-normal">
                  {art.content.replace(/[#*`]/g, '')}
                </p>
              </div>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                <span>By: <span className="font-bold text-zinc-700">{art.authorName}</span></span>
                {art.isInternal && (
                  <span className="px-1.5 py-0.2 bg-zinc-100 text-zinc-800 rounded font-bold uppercase text-[8px] tracking-wider border border-zinc-300">
                    Internal ONLY
                  </span>
                )}
                <Link
                  href={`/manager/knowledgebase#article-${art.slug}`}
                  onClick={() => alert(`Reviewing article "${art.title}" content:\n\n${art.content}`)}
                  className="text-zinc-950 font-bold flex items-center gap-0.5 hover:underline"
                >
                  <Eye size={12} />
                  Inspect
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
