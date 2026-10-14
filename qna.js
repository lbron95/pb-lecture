// 익명 Q&A 통신 — 학생 페이지와 발표 슬라이드가 함께 씁니다.
(function () {
  const API = (window.LECTURE && window.LECTURE.API_URL) || '';
  const DEMO_KEY = 'pb-lecture-demo-questions';

  function demoRead() {
    try { return JSON.parse(localStorage.getItem(DEMO_KEY)) || []; } catch (e) { return []; }
  }
  function demoWrite(list) {
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(list)); } catch (e) {}
  }

  async function list() {
    if (!API) return demoRead();
    const res = await fetch(API + (API.includes('?') ? '&' : '?') + 't=' + Date.now());
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'load_failed');
    return data.list;
  }

  async function post(payload) {
    // text/plain 으로 보내야 Apps Script 가 사전 요청(preflight) 없이 받습니다.
    const res = await fetch(API, { method: 'POST', body: JSON.stringify(payload) });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'post_failed');
    return data;
  }

  async function add(text) {
    text = String(text || '').trim().slice(0, 300);
    if (!text) throw new Error('empty');
    if (!API) {
      const l = demoRead();
      const id = Math.random().toString(36).slice(2, 10);
      l.push({ id, t: Date.now(), text, likes: 0, answer: '' });
      demoWrite(l);
      return id;
    }
    return (await post({ action: 'add', text })).id;
  }

  async function like(id) {
    if (!API) {
      const l = demoRead();
      const q = l.find(x => x.id === id);
      if (q) q.likes += 1;
      demoWrite(l);
      return;
    }
    await post({ action: 'like', id });
  }

  window.QNA = { list, add, like, demo: !API };
})();
