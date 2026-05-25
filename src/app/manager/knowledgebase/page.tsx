'use client';

import React, { useState, useEffect } from 'react';
import { useTickets } from '../../../context/TicketContext';
import { useAuth } from '../../../context/AuthContext';
import { Bookmark, Plus, Search, Tag, Eye, X, BookOpen, User, Calendar, FileText } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';

export default function ManagerKnowledgebasePage() {
  const { kbArticles, kbCategories, createKbArticle } = useTickets();
  const { user } = useAuth();
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [moduleFilter, setModuleFilter] = useState('All');
  
  // Dialog / Form Toggles
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);

  // Creation Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sapModule, setSapModule] = useState<any>('FICO');
  const [categoryId, setCategoryId] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  // Initialize category selector
  useEffect(() => {
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

    // Reset Form
    setTitle('');
    setContent('');
    setIsInternal(false);
    setShowAddForm(false);
  };

  // Filter Articles
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
    <div className="space-y-6 font-mono text-xs text-[#09090b]">
      
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-lg font-bold uppercase text-zinc-950 tracking-wider">Knowledgebase Center</h1>
          <p className="text-zinc-500 mt-1">Publish standard guides for SAP Functional teams or Internal troubleshooting wikis.</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-3.5 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5 transition"
        >
          <Plus size={12} />
          <span>Create Article</span>
        </button>
      </div>

      {/* 1. STATE-DRIVEN ARTICLE VIEW DIALOG MODAL */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1px]">
          <div className="bg-white border border-zinc-250 rounded-lg shadow-xl max-w-2xl w-full p-6 space-y-4 font-mono text-xs text-zinc-950 max-h-[85vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-150">
              <div className="flex items-center gap-2 text-[9px] uppercase font-bold text-zinc-500">
                <BookOpen size={13} className="text-zinc-400" />
                <span>Documentation Article</span>
              </div>
              <button 
                onClick={() => setSelectedArticle(null)}
                className="text-zinc-400 hover:text-zinc-950 transition"
              >
                <X size={14} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              
              {/* Title & Badges */}
              <div className="space-y-2">
                <h2 className="text-base font-bold text-zinc-950 leading-snug">{selectedArticle.title}</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-zinc-950 text-white hover:bg-zinc-900 border-none font-bold text-[8px] py-0 px-1.5 uppercase">
                    {selectedArticle.sapModule}
                  </Badge>
                  <Badge className="bg-zinc-100 text-zinc-700 hover:bg-zinc-100 border border-zinc-200 text-[8px] py-0 px-1.5 uppercase font-bold">
                    {selectedArticle.categoryName}
                  </Badge>
                  {selectedArticle.isInternal && (
                    <span className="text-[8px] font-black uppercase text-red-650 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded">
                      Internal Only
                    </span>
                  )}
                </div>
              </div>

              {/* Author & Timestamp metadata */}
              <div className="flex items-center gap-4 text-[9px] text-zinc-450 border-y border-zinc-100 py-2">
                <div className="flex items-center gap-1">
                  <User size={10} />
                  <span>Publisher: <strong>{selectedArticle.authorName}</strong></span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar size={10} />
                  <span>Published: {new Date(selectedArticle.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Document content */}
              <div className="bg-zinc-50 border border-zinc-200 rounded p-4 text-[11px] text-zinc-800 leading-relaxed font-mono whitespace-pre-wrap">
                {selectedArticle.content}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-zinc-150 flex justify-end">
              <button
                onClick={() => setSelectedArticle(null)}
                className="py-1.5 px-4 bg-zinc-900 text-white rounded font-bold hover:bg-zinc-800 uppercase transition"
              >
                Close Reader
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2. STATE-DRIVEN CREATE ARTICLE DIALOG FORM */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1px]">
          <form onSubmit={handleSubmit} className="bg-white border border-zinc-250 rounded-lg shadow-xl max-w-xl w-full p-6 space-y-4 font-mono text-xs text-zinc-955 max-h-[90vh] flex flex-col">
            
            <div className="flex items-center justify-between pb-3 border-b border-zinc-150">
              <span className="text-zinc-900 font-bold uppercase text-[10px] tracking-wider">Publish Documentation Wiki</span>
              <button 
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-zinc-400 hover:text-zinc-950 transition"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              
              <div className="space-y-1">
                <label className="font-bold text-zinc-700 uppercase text-[9px]">Article Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BASIS: Configuring Transport Requests (SE09)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono placeholder:text-zinc-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 uppercase text-[9px]">SAP Module Scope</label>
                  <select
                    value={sapModule}
                    onChange={(e) => setSapModule(e.target.value as any)}
                    className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono cursor-pointer"
                  >
                    <option value="FICO">FICO</option>
                    <option value="MM">MM</option>
                    <option value="SD">SD</option>
                    <option value="PP">PP</option>
                    <option value="HCM">HCM</option>
                    <option value="BASIS">BASIS</option>
                    <option value="ABAP">ABAP</option>
                    <option value="CPI/Integration">CPI/Integration</option>
                    <option value="Fiori">Fiori</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 uppercase text-[9px]">Wiki Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono cursor-pointer"
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
                  rows={8}
                  placeholder="# Description&#10;&#10;Explain the steps, transaction codes, and configurations required to resolve this issue..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-955 font-mono placeholder:text-zinc-400"
                />
              </div>

              <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-150 rounded p-3">
                <input
                  type="checkbox"
                  id="isInternalCheck"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="rounded text-zinc-950 focus:ring-zinc-950 cursor-pointer"
                />
                <label htmlFor="isInternalCheck" className="font-bold text-zinc-700 uppercase text-[9px] select-none cursor-pointer">
                  Internal Only (Restrict Client Portal visibility)
                </label>
              </div>

            </div>

            <div className="pt-3 border-t border-zinc-150 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="py-1.5 px-3 border border-zinc-250 hover:bg-zinc-50 rounded uppercase font-bold text-[10px] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-1.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-white rounded uppercase font-bold text-[10px] transition"
              >
                Publish Article
              </button>
            </div>

          </form>
        </div>
      )}

      {/* 3. VERCEL-LIKE FILTERS BAR */}
      <div className="bg-white border border-zinc-200 rounded-lg shadow-sm p-4 flex flex-wrap items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search titles, logs, topics..."
            className="w-full bg-white border border-zinc-200 rounded-md pl-9 pr-4 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono placeholder:text-zinc-400"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap gap-2">
          
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white border border-zinc-200 rounded-md px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-800 focus:outline-none font-mono cursor-pointer hover:border-zinc-300 transition"
          >
            <option value="All">All Categories</option>
            {kbCategories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="bg-white border border-zinc-200 rounded-md px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-800 focus:outline-none font-mono cursor-pointer hover:border-zinc-300 transition"
          >
            <option value="All">All SAP Modules</option>
            <option value="FICO">FICO</option>
            <option value="MM">MM</option>
            <option value="SD">SD</option>
            <option value="PP">PP</option>
            <option value="HCM">HCM</option>
            <option value="BASIS">BASIS</option>
            <option value="ABAP">ABAP</option>
          </select>

        </div>
      </div>

      {/* 4. ARTICLES LEDGER GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredArticles.length === 0 ? (
          <div className="col-span-2 bg-white border border-zinc-200 py-20 rounded-lg text-center text-zinc-450 italic space-y-2">
            <Bookmark className="mx-auto text-zinc-350" size={24} />
            <p className="font-bold uppercase text-[10px] text-zinc-550">No documentation found</p>
            <p className="text-[9px] text-zinc-400">Modify filters to view other published materials.</p>
          </div>
        ) : (
          filteredArticles.map(art => (
            <Card 
              key={art.id} 
              className="border border-zinc-200 rounded-lg p-5 hover:border-zinc-400 transition flex flex-col justify-between space-y-4 shadow-sm"
            >
              <div>
                
                {/* Meta Category & Module Tag */}
                <div className="flex justify-between items-center text-[9px] text-zinc-500 font-mono">
                  <span className="flex items-center gap-1 font-bold">
                    <Tag size={11} className="text-zinc-400" />
                    <span>{art.categoryName}</span>
                  </span>
                  <Badge className="bg-zinc-900 text-white hover:bg-zinc-900 text-[8px] py-0 px-1 border-none font-bold uppercase">
                    {art.sapModule}
                  </Badge>
                </div>

                {/* Title */}
                <h3 className="font-bold text-xs text-zinc-950 mt-2.5 leading-snug">{art.title}</h3>
                
                {/* Content Excerpt */}
                <p className="text-[11px] text-zinc-500 line-clamp-3 mt-1.5 leading-relaxed">
                  {art.content.replace(/[#*`]/g, '')}
                </p>

              </div>

              {/* Bottom footer bar */}
              <div className="pt-3 border-t border-zinc-150 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                <span className="font-medium">
                  Publisher: <span className="font-bold text-zinc-700">{art.authorName}</span>
                </span>
                
                {art.isInternal && (
                  <span className="px-1.5 py-0.2 bg-red-50 border border-red-200 text-red-700 rounded font-bold uppercase text-[8px] tracking-wider">
                    Internal
                  </span>
                )}

                <button
                  onClick={() => setSelectedArticle(art)}
                  className="text-zinc-950 font-bold flex items-center gap-1 hover:underline"
                >
                  <Eye size={12} />
                  <span>Inspect</span>
                </button>
              </div>

            </Card>
          ))
        )}
      </div>

    </div>
  );
}
