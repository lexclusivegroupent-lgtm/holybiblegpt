import { useMemo, useState } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { bibleAssistantGuidelines } from './lib/bibleAssistantGuidelines';

type Tab = 'home'|'chat'|'verse-study'|'devotionals'|'prayer-notes'|'saved-verses'|'about'|'privacy'|'terms';
type Msg={role:'user'|'assistant';content:string};

const starterPrompts = [
  'Explain John 3:16 in simple words',
  'Give me verses about anxiety',
  'Help me create a morning prayer',
  'What does the Bible say about forgiveness?',
  'Create a 7-day devotional about faith'
];

export default function App() {
  const [tab,setTab]=useState<Tab>('home');
  const [messages,setMessages]=useState<Msg[]>([{role:'assistant',content:'Welcome to Bible Study Buddy. How can I help your study today?'}]);
  const [input,setInput]=useState('');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [prayerNotes,setPrayerNotes]=useLocalStorage<{id:string;text:string}[]>('bsb_prayer_notes',[]);
  const [savedVerses,setSavedVerses]=useLocalStorage<{id:string;reference:string;text:string}[]>('bsb_saved_verses',[]);

  const addMessage=async(text:string)=>{ setError(''); setLoading(true); setMessages(m=>[...m,{role:'user',content:text}]);
    try {
      const reply = `Scripture-centered reflection:\n\n${text}\n\nStart with prayer, read the passage in context, and compare translations.`;
      await new Promise(r=>setTimeout(r,400));
      setMessages(m=>[...m,{role:'assistant',content:reply}]);
    } catch { setError('Unable to load response. Please try again.'); } finally { setLoading(false); }
  };

  const content = useMemo(()=>{
    if(tab==='home') return <section><div className='hero'><h1>Bible Study Buddy</h1><p className='small'>A simple Bible study companion for scripture, prayer, and daily growth.</p><div className='cta'><button className='btn btn-primary' onClick={()=>setTab('chat')}>Start Bible Study</button><button className='btn btn-secondary' onClick={()=>setTab('devotionals')}>Explore Devotionals</button></div></div><div className='grid'>{['Ask Bible questions','Study verses in context','Create devotionals','Save prayers and notes','Find scripture by topic','Grow in daily faith'].map(f=><div className='card' key={f}><strong>{f}</strong></div>)}</div></section>;
    if(tab==='chat') return <section className='card'><h2>Bible Chat</h2><p className='small'>Legacy project reference: Holy Bible GPT (internal lineage).</p>{starterPrompts.map(p=><button key={p} className='btn btn-secondary' style={{margin:'0 .5rem .5rem 0'}} onClick={()=>addMessage(p)}>{p}</button>)}<div className='chat-box'>{messages.map((m,i)=><div key={i} className={`msg ${m.role==='user'?'user':'assistant'}`}>{m.content}</div>)}{loading&&<div className='small'>Loading response...</div>}</div>{error&&<p>{error}</p>}<input value={input} onChange={e=>setInput(e.target.value)} placeholder='Ask a faith-based question...' /><div className='cta'><button className='btn btn-primary' onClick={()=>{if(input.trim()){addMessage(input.trim());setInput('');}}}>Send</button></div></section>;
    if(tab==='verse-study') return <section className='card'><h2>Verse Study</h2><input placeholder='Enter verse (e.g., Romans 8:28)'/><select><option>KJV</option><option>ESV</option><option>NIV</option></select><h3>Explanation</h3><p className='small'>Summarize the key meaning of the verse with biblical context.</p><h3>Historical Context</h3><p className='small'>Author, audience, and setting.</p><h3>Life Application</h3><p className='small'>Practical response for daily living.</p><h3>Prayer</h3><p className='small'>A short prayer rooted in scripture.</p><h3>Related Verses</h3><p className='small'>Cross-references to continue study.</p></section>;
    if(tab==='devotionals') return <section className='card'><h2>Devotionals</h2><input placeholder='Topic (e.g., Faith under pressure)'/><p><strong>Bible Verse</strong></p><p className='small'>Hebrews 11:1</p><p><strong>Reflection</strong></p><p className='small'>Faith trusts God even when the next step is not visible.</p><p><strong>Prayer</strong></p><p className='small'>Lord, grow my faith and help me walk in obedience today.</p><p><strong>Action Step</strong></p><p className='small'>Write one fear and one promise of God beside it.</p></section>;
    if(tab==='prayer-notes') return <section className='card'><h2>Prayer Notes</h2><textarea id='new-note' placeholder='Add prayer note...'></textarea><button className='btn btn-primary' onClick={()=>{const el=document.getElementById('new-note') as HTMLTextAreaElement; if(el?.value.trim()){setPrayerNotes([...prayerNotes,{id:crypto.randomUUID(),text:el.value.trim()}]);el.value='';}}}>Add</button>{prayerNotes.map(n=><div className='card' key={n.id}><textarea value={n.text} onChange={e=>setPrayerNotes(prayerNotes.map(p=>p.id===n.id?{...p,text:e.target.value}:p))}/><button className='btn btn-secondary' onClick={()=>setPrayerNotes(prayerNotes.filter(p=>p.id!==n.id))}>Delete</button></div>)}</section>;
    if(tab==='saved-verses') return <section className='card'><h2>Saved Verses</h2><input id='ref' placeholder='Reference (Psalm 23:1)'/><textarea id='vtext' placeholder='Verse text'></textarea><button className='btn btn-primary' onClick={()=>{const r=(document.getElementById('ref') as HTMLInputElement).value.trim(); const t=(document.getElementById('vtext') as HTMLTextAreaElement).value.trim(); if(r&&t){setSavedVerses([...savedVerses,{id:crypto.randomUUID(),reference:r,text:t}]);}}}>Save Verse</button>{savedVerses.map(v=><div key={v.id} className='card'><strong>{v.reference}</strong><p>{v.text}</p><button className='btn btn-secondary' onClick={()=>setSavedVerses(savedVerses.filter(x=>x.id!==v.id))}>Remove</button></div>)}</section>;
    if(tab==='about') return <section className='card'><h2>About Bible Study Buddy</h2><p>Bible Study Buddy is the modern continuation of Holy Bible GPT, rebuilt for clear scripture-focused study workflows.</p></section>;
    if(tab==='privacy') return <section className='card'><h2>Privacy Policy</h2><p>We do not hard-code API keys. User notes are stored locally unless you configure a backend.</p></section>;
    return <section className='card'><h2>Terms</h2><ul>{bibleAssistantGuidelines.map(g=><li key={g}>{g}</li>)}</ul></section>;
  },[tab,messages,loading,error,input,prayerNotes,savedVerses]);

  return <div className='app-shell'><header className='header'><div className='container header-inner'><strong>Bible Study Buddy</strong><nav className='nav'>{(['home','chat','verse-study','devotionals','prayer-notes','saved-verses','about','privacy','terms'] as Tab[]).map(t=><button key={t} onClick={()=>setTab(t)}>{t}</button>)}</nav></div></header><main className='main'><div className='container'>{content}</div></main><footer className='footer'><div className='container footer-inner'><span>© {new Date().getFullYear()} Bible Study Buddy</span><span className='small'>Legacy origin: Holy Bible GPT</span></div></footer></div>
}
