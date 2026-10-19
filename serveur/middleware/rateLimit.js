// Minimal in-memory fixed-window rate limiter (no dependency).
// Keyed by req.ip. Behind a reverse proxy, set `app.set('trust proxy', ...)` correctly
// or every visitor will share one bucket. For several servers use a shared store.
export const rateLimit = ({ windowMs, max }) => {
    const buckets = new Map();
    return (req, res, next) => {
        const now = Date.now();
        if (buckets.size > 2000) {
            for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
        }
        const key = req.ip || 'unknown';
        let bucket = buckets.get(key);
        if (!bucket || bucket.resetAt <= now) {
            bucket = { count: 0, resetAt: now + windowMs };
            buckets.set(key, bucket);
        }
        bucket.count += 1;
        if (bucket.count > max) {
            res.set('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
            return res.status(429).json({ message: 'Too many requests. Please wait a few minutes and try again.' });
        }
        next();
    };
};
