// KEIL Backend Entry Point
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import keilRoutes from './modules/keil/routes';
import { supabase, supabaseKeyType } from './config/supabase';

dotenv.config();

const app = express();
const port = process.env.PORT || 5005;

// Optimized CORS for Vercel & Local Dev
app.use(cors({
    origin: (origin, callback) => {
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    maxAge: 7200 // browser reuses the preflight answer for 2h (Chrome's maximum) instead of asking before every call
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Main App API Routes
app.use('/api/auth', authRoutes); // Auth is Global

// Keil Module Routes
app.use('/api/keil', keilRoutes);
app.use('/api/maxtron', keilRoutes); // Compatibility alias

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Keil ERP Backend API',
        health: '/api/health',
        timestamp: new Date().toISOString()
    });
});

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'KEIL ERP Backend is healthy' });
});

// Keep-alive route for Supabase (prevents pausing on free tier)
app.get('/api/keep-alive', async (req, res) => {
    try {
        const { data, error } = await supabase.from('companies').select('id').limit(1);
        if (error) throw error;
        res.json({ success: true, message: 'Supabase is active', data });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Diagnostic Route
app.get('/api/verify', (req, res) => {
    res.json({
        supabase_url: !!process.env.SUPABASE_URL,
        supabase_key: !!process.env.SUPABASE_KEY,
        supabase_key_type: supabaseKeyType,
        jwt_secret: !!process.env.JWT_SECRET,
        node_env: process.env.NODE_ENV,
        vercel: !!process.env.VERCEL
    });
});

// Catch-all for undefined API routes
app.use('/api', (req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found on this server` });
});

// Local Development Server
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(port, () => {
        console.log(`KEIL Backend running on port ${port}`);
    });
}

export default app;
