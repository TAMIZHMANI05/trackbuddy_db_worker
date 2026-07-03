module.exports = {
    apps: [
        {
            name: 'trackbuddy-db-worker',
            script: 'npm',
            args: 'run dev',
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            watch: false,
            max_memory_restart: '512M',
            env: {
                NODE_ENV: 'development',
                ENV: 'development',
                LOG_LEVEL: 'debug'
            },
            env_production: {
                NODE_ENV: 'production',
                ENV: 'production',
                LOG_LEVEL: 'info'
            },
            error_file: 'logs/error.log',
            out_file: 'logs/output.log',
            merge_logs: true,
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
        }
    ]
};
