<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
      <link rel="icon" type="image/png" href="/images/SHRMS.png">
    <title>Smart HRMS | 404 Not Found</title>
    <style>
        :root {
            color-scheme: light dark;
            --brand-strong: #1f5e34;
            --brand-base: #4a7c3c;
            --surface: #ffffff;
            --text: #0f172a;
            --muted: #475569;
            --border: #dbe5dd;
            --backdrop: #f3f8f1;
        }
        @font-face {
            font-family: 'Montserrat';
            src: url('/fonts/Montserrat-VariableFont_wght.ttf') format('truetype');
            font-style: normal;
            font-display: swap;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Montserrat', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
            color: var(--text);
            background:
                radial-gradient(circle at 10% 15%, rgba(145, 195, 131, 0.3), transparent 36%),
                radial-gradient(circle at 88% 85%, rgba(74, 124, 60, 0.22), transparent 40%),
                var(--backdrop);
            padding: 1.25rem;
        }
        .card {
            width: min(92vw, 760px);
            background: linear-gradient(165deg, rgba(255, 255, 255, 0.98), rgba(240, 248, 237, 0.95));
            border: 1px solid var(--border);
            border-radius: 18px;
            padding: 2rem 2rem 1.8rem;
            box-shadow: 0 20px 45px -28px rgba(31, 94, 52, 0.42), 0 8px 16px rgba(15, 23, 42, 0.07);
        }
        .badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            border-radius: 999px;
            border: 1px solid rgba(74, 124, 60, 0.38);
            background: rgba(255, 255, 255, 0.85);
            color: var(--brand-strong);
            font-size: 0.82rem;
            padding: 0.3rem 0.72rem;
        }
        .dot {
            width: 0.54rem;
            height: 0.54rem;
            border-radius: 999px;
            background: var(--brand-base);
            box-shadow: 0 0 0 5px rgba(145, 195, 131, 0.25);
        }
        .code {
            margin: 0.95rem 0 0;
            font-size: 0.84rem;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--brand-base);
        }
        h1 { margin: 0.4rem 0 0; font-size: clamp(1.75rem, 2.7vw, 2.35rem); line-height: 1.2; font-weight: 400; }
        p { margin: 0.95rem 0 0; line-height: 1.6; color: var(--muted); max-width: 62ch; }
        .actions { margin-top: 1.55rem; display: flex; gap: 0.75rem; flex-wrap: wrap; }
        .btn {
            display: inline-block;
            border-radius: 11px;
            padding: 0.66rem 1rem;
            text-decoration: none;
            font-size: 0.92rem;
            border: 1px solid transparent;
        }
        .btn-primary { background: var(--brand-base); color: #f8fff9; border-color: rgba(31, 94, 52, 0.42); }
        .btn-primary:hover { background: var(--brand-strong); }
        .btn-secondary { background: #ffffff; border-color: #cbd5e1; color: var(--text); }
        .btn-secondary:hover { background: #f8fafc; }
        .brand { margin-top: 1.35rem; font-size: 0.8rem; color: #64748b; letter-spacing: 0.03em; }
        @media (prefers-color-scheme: dark) {
            :root {
                --surface: #0f172a;
                --text: #e2e8f0;
                --muted: #cbd5e1;
                --border: #2e4e36;
                --backdrop: #0b1310;
            }
            body {
                background:
                    radial-gradient(circle at 14% 15%, rgba(74, 124, 60, 0.32), transparent 38%),
                    radial-gradient(circle at 85% 82%, rgba(145, 195, 131, 0.14), transparent 42%),
                    var(--backdrop);
            }
            .card {
                background: linear-gradient(160deg, rgba(15, 23, 42, 0.95), rgba(15, 30, 22, 0.92));
                border-color: var(--border);
                box-shadow: 0 22px 42px -26px rgba(0, 0, 0, 0.62), 0 0 0 1px rgba(74, 124, 60, 0.22);
            }
            .badge { background: rgba(15, 23, 42, 0.65); border-color: rgba(145, 195, 131, 0.35); color: #d9f0d2; }
            .btn-secondary { background: #0f172a; border-color: #475569; color: #e2e8f0; }
            .btn-secondary:hover { background: #111d2f; }
            .brand { color: #94a3b8; }
        }
    </style>
</head>
<body>
    @php
        $user = auth()->user();
        $dashboardUrl = $user?->role === 'hr-personnel'
            ? route('admin.performance-dashboard')
            : route('dashboard');
        $primaryUrl = $user ? $dashboardUrl : route('home');
        $primaryLabel = $user ? 'Go to Dashboard' : 'Go to Home';
    @endphp
    <main class="card" role="main">
        <span class="badge">
            <span class="dot" aria-hidden="true"></span>
            Smart HRMS
        </span>
        <p class="code">404 Not Found</p>
        <h1>Page not found</h1>
        <p>{{ $exception->getMessage() ?: 'The page you are looking for does not exist or has been moved.' }}</p>
        <div class="actions">
            <a href="{{ $primaryUrl }}" class="btn btn-primary">{{ $primaryLabel }}</a>
            <a href="javascript:history.back()" class="btn btn-secondary">Go Back</a>
        </div>
        <p class="brand">Human Resource Management System</p>
    </main>
</body>
</html>
