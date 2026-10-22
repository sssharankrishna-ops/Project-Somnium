/*
 * SOMNIUM — AI Dream Journal Frontend
 * Complete interactive application
 */

const API_BASE = 'http://localhost:8000';

class SomniumApp {
    constructor() {
        this.currentView = 'journal';
        this.dreams = [];
        this.userStats = null;
        this.symbolOntology = null;
        this.init();
    }

    init() {
        this.bindNavigation();
        this.bindForm();
        this.bindSeedButton();
        this.checkConnection();
        this.loadDreams();
        this.loadOntology();

        const rangeSlider = document.getElementById('sleepQuality');
        const rangeValue = document.getElementById('sleepQualityValue');
        if (rangeSlider && rangeValue) {
            rangeSlider.addEventListener('input', (e) => {
                rangeValue.textContent = e.target.value;
            });
        }
    }

    bindNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchView(btn.dataset.view);
            });
        });
    }

    switchView(viewName) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        const target = document.getElementById(viewName + 'View');
        if (target) target.classList.add('active');
        this.currentView = viewName;
        if (viewName === 'dna') this.loadDreamDNA();
        else if (viewName === 'insights') this.loadInsights();
        else if (viewName === 'journal') this.loadDreams();
    }

    async apiCall(endpoint, options = {}) {
        try {
            const response = await fetch(API_BASE + endpoint, {
                headers: { 'Content-Type': 'application/json', ...options.headers },
                ...options
            });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            this.showToast('API Error: ' + error.message, 'error');
            throw error;
        }
    }

    async checkConnection() {
        const dot = document.querySelector('.status-dot');
        const text = document.querySelector('.status-text');
        try {
            await this.apiCall('/api/health');
            dot.classList.add('connected');
            text.textContent = 'Connected';
            this.showToast('Connected to Somnium API', 'success');
        } catch (e) {
            dot.classList.add('error');
            text.textContent = 'Disconnected';
            this.showToast('Backend not running. Start it with: python main.py', 'error');
        }
    }

    bindForm() {
        const form = document.getElementById('dreamForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitDream();
            });
        }
    }

    async submitDream() {
        const btn = document.querySelector('#dreamForm button[type="submit"]');
        btn.classList.add('btn-loading');
        btn.innerHTML = '<span class="loading-spinner"></span> Analyzing...';

        const entry = {
            title: document.getElementById('dreamTitle').value,
            description: document.getElementById('dreamDescription').value,
            mood_before_sleep: document.getElementById('moodBefore').value,
            sleep_quality: parseInt(document.getElementById('sleepQuality').value),
            sleep_hours: parseFloat(document.getElementById('sleepHours').value),
            tags: document.getElementById('dreamTags').value.split(',').map(t => t.trim()).filter(t => t),
            lucid: document.getElementById('isLucid').checked,
            recurring: document.getElementById('isRecurring').checked
        };

        try {
            const result = await this.apiCall('/api/dreams/analyze', {
                method: 'POST',
                body: JSON.stringify(entry)
            });
            this.renderAnalysisResult(result, entry);
            this.showToast('Dream analyzed successfully!', 'success');
            document.getElementById('dreamForm').reset();
            document.getElementById('sleepQualityValue').textContent = '7';
        } catch (e) {
            console.error(e);
        } finally {
            btn.classList.remove('btn-loading');
            btn.innerHTML = '<span class="btn-icon">🔮</span> Analyze Dream';
        }
    }

    renderAnalysisResult(analysis, entry) {
        const panel = document.getElementById('resultPanel');
        const sentimentClass = analysis.sentiment_score > 0.2 ? 'positive' : analysis.sentiment_score < -0.2 ? 'negative' : 'neutral';
        const sentimentPercent = Math.abs(analysis.sentiment_score) * 100;

        const dnaColors = ['#8b5cf6','#a78bfa','#60a5fa','#2dd4bf','#fbbf24','#fb7185','#f472b6','#34d399','#818cf8','#a5b4fc'];
        const dimLabels = ['Emotion','Freedom','Insecurity','Transformation','Threshold','Polarity','Subjectivity','Happy','Sad','Anxious','Sleep Q','Sleep H','Pos Mood','Neg Mood','Neutral Mood','Length','Lucid','Recurring','Tags','Symbol Count'];

        const dnaBars = analysis.dream_dna.vector.map((v, i) => {
            const h = Math.max(20, v * 80);
            return '<div class="dna-bar" style="height:' + h + 'px;background:' + dnaColors[i % dnaColors.length] + '" data-dim="' + dimLabels[i] + '" title="' + dimLabels[i] + ': ' + (v*100).toFixed(1) + '%"></div>';
        }).join('');

        const symbolsHtml = analysis.extracted_symbols.map(sym => {
            return '<div class="symbol-card">' +
                '<div class="symbol-card-header"><span class="symbol-name">' + sym.symbol + '</span><span class="symbol-confidence">' + (sym.confidence*100).toFixed(0) + '%</span></div>' +
                '<div class="symbol-archetype">' + sym.archetype + ' archetype</div>' +
                '<div class="symbol-meanings">' + sym.meanings.map(m => '<span class="meaning-tag">' + m + '</span>').join('') + '</div>' +
                '<div class="symbol-explanation">' + sym.explanation + '</div>' +
                (sym.personal_frequency > 1 ? '<div class="symbol-recurring">🔄 Recurring (' + sym.personal_frequency + 'x in your journal)</div>' : '') +
                '</div>';
        }).join('');

        const similarHtml = analysis.similar_past_dreams.length > 0 ?
            '<div class="similar-dreams-list">' + analysis.similar_past_dreams.map(sim =>
                '<div class="similar-dream-item" onclick="app.showDreamDetail(\'' + sim.dream_id + '\')">' +
                '<div class="similar-dream-title">' + sim.title + '</div>' +
                '<div class="similar-dream-meta"><span>' + new Date(sim.date).toLocaleDateString() + '</span><span class="similarity-score">' + (sim.similarity_score*100).toFixed(0) + '% match</span><span>Shared: ' + sim.shared_symbols.join(', ') + '</span></div>' +
                '</div>'
            ).join('') + '</div>' :
            '<p style="color:var(--text-muted);font-size:0.9rem;">No similar dreams found yet. Record more dreams to unlock pattern matching!</p>';

        const traceHtml = analysis.explanation_trace.map(t => '<div class="trace-item">' + t + '</div>').join('');
        const collectiveHtml = analysis.collective_insight ?
            '<div class="collective-section"><div class="collective-icon">🌍</div><div class="collective-text">' + analysis.collective_insight + '</div></div>' : '';

        panel.innerHTML = '<div class="analysis-result">' +
            '<div class="result-header"><h3>✨ Analysis Complete</h3><p>' + entry.title + ' — ' + new Date().toLocaleDateString() + '</p></div>' +
            '<div class="sentiment-section"><div class="section-title">📊 Sentiment Analysis</div><div class="sentiment-gauge">' +
            '<div class="gauge-bar"><div class="gauge-fill ' + sentimentClass + '" style="width:' + sentimentPercent + '%"></div></div>' +
            '<div class="gauge-labels"><span>Negative</span><span>' + (analysis.sentiment_score > 0 ? 'Positive' : analysis.sentiment_score < 0 ? 'Negative' : 'Neutral') + ' (' + analysis.sentiment_score.toFixed(2) + ')</span><span>Positive</span></div>' +
            '<div class="emotion-chips">' + analysis.dominant_emotions.map(e => '<span class="emotion-chip ' + e.intensity + '">' + e.emotion + ' ' + (e.score*100).toFixed(0) + '%</span>').join('') + '</div>' +
            '</div></div>' +
            '<div class="symbols-section"><div class="section-title">🔮 Extracted Symbols</div><div class="symbols-grid">' + (symbolsHtml || '<p style="color:var(--text-muted)">No strong symbols detected.</p>') + '</div></div>' +
            '<div class="interpretation-section"><div class="section-title">📝 Interpretation</div><div class="interpretation-text">' + analysis.interpretation + '</div></div>' +
            '<div class="dna-mini-section"><div class="section-title">🧬 Dream DNA Fingerprint</div><div class="dna-fingerprint"><div class="dna-vector">' + dnaBars + '</div>' +
            '<div class="dna-traits"><div class="dna-trait"><span class="dna-trait-label">Archetype</span><span class="dna-trait-value">' + analysis.dream_dna.dominant_archetype + '</span></div>' +
            '<div class="dna-trait"><span class="dna-trait-label">Emotion</span><span class="dna-trait-value">' + analysis.dream_dna.emotional_signature + '</span></div>' +
            '<div class="dna-trait"><span class="dna-trait-label">Complexity</span><span class="dna-trait-value">' + (analysis.dream_dna.complexity_score*100).toFixed(0) + '%</span></div>' +
            '<div class="dna-trait"><span class="dna-trait-label">Lucidity</span><span class="dna-trait-value">' + (analysis.dream_dna.lucidity_marker ? 'Yes' : 'No') + '</span></div></div></div></div>' +
            '<div class="lucidity-section"><div class="section-title">🌟 Lucidity Probability</div><div class="lucidity-meter">' +
            '<div class="lucidity-value">' + (analysis.lucidity_probability*100).toFixed(0) + '%</div>' +
            '<div class="lucidity-label">Chance of becoming lucid in similar dreams</div>' +
            '<div class="lucidity-bar"><div class="lucidity-bar-fill" style="width:' + (analysis.lucidity_probability*100) + '%"></div></div></div></div>' +
            (analysis.recurring_pattern_detected ? '<div class="similar-section"><div class="section-title">🔄 Similar Past Dreams</div>' + similarHtml + '</div>' : '') +
            '<div class="trace-section"><div class="section-title">🔍 XAI Explanation Trace</div><div class="trace-list">' + traceHtml + '</div></div>' +
            collectiveHtml + '</div>';
    }

    async loadDreams() {
        try {
            this.dreams = await this.apiCall('/api/dreams');
            this.renderDreamsGrid();
        } catch (e) { console.error(e); }
    }

    renderDreamsGrid() {
        const grid = document.getElementById('dreamsGrid');
        const empty = document.getElementById('emptyState');
        if (!grid || !empty) return;
        if (this.dreams.length === 0) {
            grid.style.display = 'none';
            empty.style.display = 'block';
            return;
        }
        grid.style.display = 'grid';
        empty.style.display = 'none';
        grid.innerHTML = this.dreams.map(d => {
            const a = d.analysis || {};
            const syms = a.symbols || [];
            const sent = a.sentiment || {};
            const sClass = sent.polarity > 0.2 ? 'sentiment-positive' : sent.polarity < -0.2 ? 'sentiment-negative' : 'sentiment-neutral';
            const sIcon = sent.polarity > 0.2 ? '😊' : sent.polarity < -0.2 ? '😰' : '😐';
            return '<div class="dream-card" onclick="app.showDreamDetail(\'' + d.id + '\')">' +
                '<div class="dream-card-header"><div class="dream-card-title">' + d.title + '</div>' +
                '<div class="dream-card-badges">' + (d.lucid ? '<span class="badge badge-lucid">Lucid</span>' : '') + (d.recurring ? '<span class="badge badge-recurring">Recurring</span>' : '') + '</div></div>' +
                '<div class="dream-card-date">' + new Date(d.date).toLocaleDateString('en-US', { weekday:'short', year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) + '</div>' +
                '<div class="dream-card-preview">' + d.description + '</div>' +
                '<div class="dream-card-footer"><div class="dream-card-symbols">' + syms.slice(0,3).map(s => '<span class="symbol-chip">' + s.symbol + '</span>').join('') + (syms.length > 3 ? '<span class="symbol-chip">+' + (syms.length-3) + '</span>' : '') + '</div>' +
                '<div class="dream-card-sentiment ' + sClass + '"><span>' + sIcon + '</span><span>' + (sent.label || 'Neutral') + '</span></div></div></div>';
        }).join('');
    }

    async showDreamDetail(id) {
        try {
            const dream = await this.apiCall('/api/dreams/' + id);
            const modal = document.getElementById('dreamModal');
            const content = document.getElementById('modalContent');
            const a = dream.analysis || {};
            content.innerHTML = '<div style="margin-bottom:1.5rem;"><h2 style="font-family:var(--font-display);font-size:2rem;color:var(--text-primary);margin-bottom:0.5rem;">' + dream.title + '</h2>' +
                '<p style="color:var(--text-muted);font-size:0.9rem;">' + new Date(dream.date).toLocaleString() + '</p></div>' +
                '<div style="background:var(--bg-tertiary);border-radius:var(--radius-md);padding:1.5rem;margin-bottom:1.5rem;">' +
                '<h3 style="font-size:0.85rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-accent);margin-bottom:1rem;">Dream Description</h3>' +
                '<p style="color:var(--text-secondary);line-height:1.7;">' + dream.description + '</p></div>' +
                '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1.5rem;">' +
                '<div style="background:var(--bg-tertiary);border-radius:var(--radius-sm);padding:1rem;text-align:center;">' +
                '<div style="font-size:1.5rem;margin-bottom:0.25rem;">' + (dream.mood_before_sleep === 'happy' ? '😊' : dream.mood_before_sleep === 'sad' ? '😢' : dream.mood_before_sleep === 'anxious' ? '😰' : dream.mood_before_sleep === 'excited' ? '🤩' : dream.mood_before_sleep === 'stressed' ? '😫' : dream.mood_before_sleep === 'tired' ? '😴' : '😐') + '</div>' +
                '<div style="font-size:0.8rem;color:var(--text-muted);">Mood: ' + dream.mood_before_sleep + '</div></div>' +
                '<div style="background:var(--bg-tertiary);border-radius:var(--radius-sm);padding:1rem;text-align:center;"><div style="font-size:1.5rem;margin-bottom:0.25rem;">⭐</div><div style="font-size:0.8rem;color:var(--text-muted);">Sleep: ' + dream.sleep_quality + '/10</div></div>' +
                '<div style="background:var(--bg-tertiary);border-radius:var(--radius-sm);padding:1rem;text-align:center;"><div style="font-size:1.5rem;margin-bottom:0.25rem;">⏰</div><div style="font-size:0.8rem;color:var(--text-muted);">Hours: ' + dream.sleep_hours + 'h</div></div></div>' +
                (a.interpretation ? '<div style="background:linear-gradient(135deg, rgba(139,92,246,0.05), rgba(96,165,250,0.05));border:1px solid rgba(139,92,246,0.15);border-radius:var(--radius-md);padding:1.5rem;margin-bottom:1.5rem;">' +
                '<h3 style="font-size:0.85rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-accent);margin-bottom:1rem;">📝 AI Interpretation</h3>' +
                '<p style="font-family:var(--font-display);font-size:1.1rem;line-height:1.7;color:var(--text-primary);">' + a.interpretation + '</p></div>' : '') +
                (a.symbols && a.symbols.length > 0 ? '<div style="margin-bottom:1.5rem;"><h3 style="font-size:0.85rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-accent);margin-bottom:1rem;">🔮 Detected Symbols</h3>' +
                '<div style="display:flex;flex-direction:column;gap:0.75rem;">' + a.symbols.map(s =>
                    '<div style="background:var(--bg-tertiary);border-radius:var(--radius-sm);padding:1rem;border-left:3px solid var(--accent-purple);">' +
                    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.25rem;">' +
                    '<span style="font-weight:600;color:var(--text-primary);">' + s.symbol + '</span>' +
                    '<span style="font-size:0.8rem;color:var(--accent-purple-light);background:rgba(139,92,246,0.15);padding:2px 8px;border-radius:12px;">' + (s.confidence*100).toFixed(0) + '%</span></div>' +
                    '<div style="font-size:0.8rem;color:var(--accent-gold);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.5rem;">' + s.archetype + '</div>' +
                    '<div style="font-size:0.85rem;color:var(--text-muted);">' + s.explanation + '</div></div>'
                ).join('') + '</div></div>' : '') +
                '<div style="display:flex;gap:1rem;justify-content:center;">' +
                '<button class="btn-secondary" onclick="app.closeModal()">Close</button>' +
                '<button class="btn-secondary" style="color:var(--accent-rose);border-color:var(--accent-rose);" onclick="app.deleteDream(\'' + dream.id + '\')">🗑️ Delete</button></div>';
            modal.classList.add('active');
        } catch (e) {
            this.showToast('Failed to load dream details', 'error');
        }
    }

    closeModal() {
        document.getElementById('dreamModal').classList.remove('active');
    }

    async deleteDream(id) {
        if (!confirm('Delete this dream?')) return;
        try {
            await this.apiCall('/api/dreams/' + id, { method: 'DELETE' });
            this.closeModal();
            this.loadDreams();
            this.showToast('Dream deleted', 'success');
        } catch (e) {
            this.showToast('Failed to delete', 'error');
        }
    }

    async loadDreamDNA() {
        try {
            const stats = await this.apiCall('/api/stats');
            this.renderDreamDNA(stats);
        } catch (e) { console.error(e); }
    }

    renderDreamDNA(stats) {
        const container = document.getElementById('dnaContainer');
        if (!container) return;
        if (stats.total_dreams === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">🧬</div><h3>Dream DNA not yet generated</h3><p>Analyze at least one dream to generate your unique Dream DNA fingerprint.</p></div>';
            return;
        }
        const dna = stats.dream_dna_fingerprint;
        const vector = dna.vector || [];
        const radarSvg = this.generateRadarChart(vector);
        const dimLabels = ['Emotion','Freedom','Insecurity','Transformation','Threshold','Polarity','Subjectivity','Happy','Sad','Anxious','Sleep Quality','Sleep Hours','Positive Mood','Negative Mood','Neutral Mood','Length','Lucid','Recurring','Tags','Symbol Count'];
        const dimColors = ['#8b5cf6','#a78bfa','#60a5fa','#2dd4bf','#fbbf24','#fb7185','#f472b6','#34d399','#818cf8','#a5b4fc','#8b5cf6','#60a5fa','#2dd4bf','#fb7185','#fbbf24','#f472b6','#34d399','#818cf8','#a5b4fc','#8b5cf6'];

        container.innerHTML = '<div class="dna-visualization"><div class="dna-title">Your Dream DNA Fingerprint</div>' +
            '<div class="dna-subtitle">20-dimensional vector encoding your subconscious patterns • ' + stats.total_dreams + ' dreams analyzed</div>' +
            '<div class="dna-radar-container">' + radarSvg + '</div>' +
            '<div class="dna-dimensions">' + vector.map((v, i) =>
                '<div class="dna-dimension-card"><div class="dna-dim-label">' + dimLabels[i] + '</div>' +
                '<div class="dna-dim-value">' + (v * 100).toFixed(1) + '%</div>' +
                '<div class="dna-dim-bar"><div class="dna-dim-bar-fill" style="width:' + (v * 100) + '%;background:' + dimColors[i % dimColors.length] + '"></div></div></div>'
            ).join('') + '</div></div>' +
            '<div class="dna-visualization"><div class="dna-title">Evolution Stage</div><div class="dna-subtitle">Your dreaming profile maturity</div>' +
            '<div style="text-align:center;padding:2rem;">' +
            '<div style="font-family:var(--font-display);font-size:3rem;font-weight:700;color:var(--accent-purple-light);margin-bottom:1rem;">' + (dna.evolution_stage || 'emerging') + '</div>' +
            '<div style="color:var(--text-muted);font-size:0.9rem;">' + (dna.evolution_stage === 'emerging' ? 'Your dream profile is just beginning to form. Keep recording!' : dna.evolution_stage === 'developing' ? 'Your subconscious patterns are becoming clear. Fascinating trends emerging!' : 'Your dream DNA is mature and rich with patterns. You are deeply connected to your subconscious.') + '</div></div></div>';
    }

    generateRadarChart(vector) {
        const size = 400, center = size / 2, radius = 140, numPoints = vector.length;
        let points = [];
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * 2 * Math.PI - Math.PI / 2;
            const r = radius * (vector[i] || 0);
            points.push((center + r * Math.cos(angle)) + ',' + (center + r * Math.sin(angle)));
        }
        let gridCircles = '';
        for (let i = 1; i <= 5; i++) {
            const r = (radius / 5) * i;
            gridCircles += '<circle cx="' + center + '" cy="' + center + '" r="' + r + '" fill="none" stroke="#2a2a4a" stroke-width="1" opacity="0.5"/>';
        }
        let axisLines = '';
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * 2 * Math.PI - Math.PI / 2;
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);
            axisLines += '<line x1="' + center + '" y1="' + center + '" x2="' + x + '" y2="' + y + '" stroke="#2a2a4a" stroke-width="1" opacity="0.3"/>';
        }
        return '<svg class="dna-radar-svg" viewBox="0 0 ' + size + ' ' + size + '" xmlns="http://www.w3.org/2000/svg">' + gridCircles + axisLines +
            '<polygon points="' + points.join(' ') + '" fill="rgba(139, 92, 246, 0.2)" stroke="#8b5cf6" stroke-width="2"/>' +
            points.map(p => '<circle cx="' + p.split(',')[0] + '" cy="' + p.split(',')[1] + '" r="4" fill="#a78bfa"/>').join('') + '</svg>';
    }

    async loadInsights() {
        try {
            const stats = await this.apiCall('/api/stats');
            this.renderInsights(stats);
        } catch (e) { console.error(e); }
    }

    renderInsights(stats) {
        const container = document.getElementById('insightsContainer');
        if (!container) return;
        if (stats.total_dreams === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">📈</div><h3>No insights available yet</h3><p>Record more dreams to unlock detailed statistics and pattern analysis.</p></div>';
            return;
        }
        const emotionColors = { happy: '#2dd4bf', sad: '#60a5fa', anxious: '#fb7185', fear: '#fb7185', excited: '#fbbf24', peaceful: '#34d399', angry: '#f472b6', love: '#f472b6', confused: '#a78bfa', empowered: '#8b5cf6' };

        container.innerHTML = '<div class="stats-grid">' +
            '<div class="stat-card"><div class="stat-value">' + stats.total_dreams + '</div><div class="stat-label">Total Dreams</div><div class="stat-sublabel">Recorded in journal</div></div>' +
            '<div class="stat-card"><div class="stat-value">' + stats.lucid_dreams + '</div><div class="stat-label">Lucid Dreams</div><div class="stat-sublabel">' + ((stats.lucid_dreams / stats.total_dreams) * 100).toFixed(0) + '% of total</div></div>' +
            '<div class="stat-card"><div class="stat-value">' + stats.avg_sleep_quality + '</div><div class="stat-label">Avg Sleep Quality</div><div class="stat-sublabel">Out of 10</div></div>' +
            '<div class="stat-card"><div class="stat-value">' + stats.avg_sleep_hours + 'h</div><div class="stat-label">Avg Sleep Duration</div><div class="stat-sublabel">Hours per night</div></div></div>' +
            '<div class="insights-section"><h3>🔄 Recurring Symbols</h3>' + (stats.recurring_symbols.length > 0 ?
                '<div style="display:flex;flex-direction:column;gap:0.75rem;">' + stats.recurring_symbols.map(s =>
                    '<div style="display:flex;justify-content:space-between;align-items:center;padding:1rem;background:var(--bg-tertiary);border-radius:var(--radius-sm);border-left:3px solid var(--accent-purple);">' +
                    '<div><div style="font-weight:600;color:var(--text-primary);font-size:1.1rem;">' + s.symbol + '</div><div style="font-size:0.8rem;color:var(--text-muted);">Appeared in ' + s.percentage + '% of your dreams</div></div>' +
                    '<div style="font-family:var(--font-display);font-size:1.5rem;font-weight:700;color:var(--accent-purple-light);">' + s.count + 'x</div></div>'
                ).join('') + '</div>' : '<p style="color:var(--text-muted);">No recurring symbols yet. Keep dreaming!</p>') + '</div>' +
            '<div class="insights-section"><h3>📈 Emotion Timeline</h3>' + (stats.emotion_timeline.length > 0 ?
                '<div class="emotion-timeline">' + stats.emotion_timeline.slice(-10).map(e =>
                    '<div class="timeline-item"><span class="timeline-date">' + new Date(e.date).toLocaleDateString() + '</span>' +
                    '<span class="timeline-emotion" style="color:' + (emotionColors[e.emotion] || '#a0a0c0') + '">' + e.emotion + '</span>' +
                    '<div class="timeline-bar-container"><div class="timeline-bar" style="width:' + (Math.abs(e.score) * 100) + '%;background:' + (emotionColors[e.emotion] || '#a0a0c0') + '"></div></div></div>'
                ).join('') + '</div>' : '<p style="color:var(--text-muted);">No emotion data yet.</p>') + '</div>' +
            '<div class="insights-section"><h3>📊 Symbol Evolution</h3>' + (stats.symbol_evolution.length > 0 ?
                '<div class="symbol-evolution-list">' + stats.symbol_evolution.map(s =>
                    '<div class="evolution-item"><span class="evolution-symbol">' + s.symbol + '</span>' +
                    '<div class="evolution-meta"><span>' + s.frequency + ' occurrences</span><span class="evolution-trend trend-' + s.trend + '">' + s.trend + '</span></div></div>'
                ).join('') + '</div>' : '<p style="color:var(--text-muted);">Record more dreams to see symbol evolution.</p>') + '</div>' +
            '<div class="insights-section"><h3>🌟 Dream Signs (Lucidity Triggers)</h3>' + (stats.dream_signs.length > 0 ?
                '<div class="dream-signs-list">' + stats.dream_signs.map(s => '<div class="dream-sign-chip">🔮 ' + s + '</div>').join('') + '</div>' +
                '<p style="color:var(--text-muted);margin-top:1rem;font-size:0.9rem;">These recurring elements can be used as reality-check triggers for lucid dreaming practice!</p>' :
                '<p style="color:var(--text-muted);">No dream signs detected yet. Record at least 3 dreams with recurring symbols.</p>') + '</div>';
    }

    async loadOntology() {
        try {
            this.symbolOntology = await this.apiCall('/api/symbols');
            this.renderOntology();
        } catch (e) { console.error(e); }
    }

    renderOntology() {
        const grid = document.getElementById('ontologyGrid');
        if (!grid) return;
        const symbols = {
            "water": {"archetype": "emotion", "meanings": ["unconscious mind", "emotional state", "purification", "life force"], "contexts": ["ocean", "river", "rain", "flood", "pool"]},
            "flying": {"archetype": "freedom", "meanings": ["liberation", "ambition", "escape", "spiritual elevation"], "contexts": ["sky", "wings", "floating", "falling"]},
            "falling": {"archetype": "insecurity", "meanings": ["loss of control", "fear of failure", "letting go", "grounding needed"], "contexts": ["cliff", "building", "sky", "depths"]},
            "door": {"archetype": "threshold", "meanings": ["new opportunities", "transition", "hidden aspects", "choices"], "contexts": ["locked", "open", "red", "mysterious"]},
            "snake": {"archetype": "transformation", "meanings": ["rebirth", "hidden threats", "wisdom", "sexuality"], "contexts": ["biting", "shedding", "coiled", "colorful"]},
            "teeth": {"archetype": "power", "meanings": ["self-image", "communication", "aging anxiety", "confidence"], "contexts": ["falling out", "breaking", "growing", "sharp"]},
            "chase": {"archetype": "avoidance", "meanings": ["running from problems", "unresolved issues", "fear", "pursuit of goals"], "contexts": ["monster", "person", "unknown", "animal"]},
            "fire": {"archetype": "passion", "meanings": ["transformation", "anger", "creativity", "destruction"], "contexts": ["burning", "warmth", "wildfire", "candle"]},
            "house": {"archetype": "self", "meanings": ["psyche structure", "family", "security", "identity"], "contexts": ["old", "new", "haunted", "childhood"]},
            "animal": {"archetype": "instinct", "meanings": ["primal urges", "spirit guide", "unrecognized traits", "nature connection"], "contexts": ["talking", "wild", "tame", "mythical"]},
            "death": {"archetype": "endings", "meanings": ["transformation", "fear of change", "closure", "rebirth"], "contexts": ["self", "loved one", "stranger", "animal"]},
            "baby": {"archetype": "potential", "meanings": ["new beginnings", "vulnerability", "creativity", "innocence"], "contexts": ["crying", "laughing", "yours", "unknown"]},
            "school": {"archetype": "learning", "meanings": ["life lessons", "anxiety", "growth", "evaluation"], "contexts": ["exam", "forgot homework", "teaching", "graduation"]},
            "naked": {"archetype": "vulnerability", "meanings": ["exposure", "authenticity", "shame", "freedom"], "contexts": ["public", "alone", "comfortable", "embarrassed"]},
            "car": {"archetype": "journey", "meanings": ["life direction", "control", "ambition", "status"], "contexts": ["driving", "passenger", "crash", "lost"]},
            "bridge": {"archetype": "connection", "meanings": ["transition", "overcoming obstacles", "linking worlds", "decision point"], "contexts": ["crossing", "broken", "high", "under"]},
            "mirror": {"archetype": "reflection", "meanings": ["self-perception", "truth", "identity", "vanity"], "contexts": ["broken", "talking", "different face", "infinite"]},
            "forest": {"archetype": "unknown", "meanings": ["exploration", "lost", "growth", "mystery"], "contexts": ["dark", "enchanted", "clearing", "path"]},
            "mountain": {"archetype": "challenge", "meanings": ["obstacles", "achievement", "perspective", "stability"], "contexts": ["climbing", "peak", "avalanche", "view"]},
            "ocean": {"archetype": "depth", "meanings": ["vast unconscious", "emotions", "mystery", "infinity"], "contexts": ["deep", "stormy", "calm", "drowning"]},
        };
        const personalCounts = this.symbolOntology || {};
        grid.innerHTML = Object.entries(symbols).map(([name, data]) => {
            const pc = personalCounts[name]?.count || 0;
            return '<div class="ontology-card"><div class="ontology-symbol">' + name + '</div>' +
                '<div class="ontology-archetype">' + data.archetype + ' archetype</div>' +
                '<div class="ontology-meanings">' + data.meanings.map(m => '<div class="ontology-meaning">' + m + '</div>').join('') + '</div>' +
                '<div class="ontology-contexts">' + data.contexts.map(c => '<span class="ontology-context">' + c + '</span>').join('') + '</div>' +
                (pc > 0 ? '<div style="margin-top:0.75rem;font-size:0.8rem;color:var(--accent-purple-light);">📖 Personal frequency: ' + pc + 'x</div>' : '') + '</div>';
        }).join('');
    }

    bindSeedButton() {
        const btn = document.getElementById('seedBtn');
        if (btn) {
            btn.addEventListener('click', async () => {
                btn.disabled = true;
                btn.innerHTML = '<span class="loading-spinner"></span> Seeding...';
                try {
                    await this.apiCall('/api/dreams/seed', { method: 'POST' });
                    this.showToast('Sample dreams seeded!', 'success');
                    this.loadDreams();
                    this.loadOntology();
                } catch (e) {
                    this.showToast('Failed to seed data', 'error');
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = '🌱 Seed Data';
                }
            });
        }
    }

    showToast(message, type) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'toast ' + type;
        const icons = { success: '✅', error: '❌', info: 'ℹ️' };
        toast.innerHTML = '<span>' + (icons[type] || 'ℹ️') + '</span><span>' + message + '</span>';
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
}

const app = new SomniumApp();
