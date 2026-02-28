<?php
if (!class_exists('Cache')) {
    class Cache
    {
        private static string $cacheDir = __DIR__ . '/../../cache';
        private static int $defaultTTL = 300; // 5 minutes

        public static function init(): void
        {
            if (!is_dir(self::$cacheDir)) {
                mkdir(self::$cacheDir, 0755, true);
            }
        }

        private static function key(string $key): string
        {
            return self::$cacheDir . '/' . md5($key) . '.cache';
        }

        public static function get(string $key): mixed
        {
            $file = self::key($key);
            if (!file_exists($file))
                return null;

            $data = json_decode(file_get_contents($file), true);
            if (!$data || time() > $data['expires_at']) {
                @unlink($file);
                return null;
            }
            return $data['value'];
        }

        public static function gc(): void
        {
            $files = glob(self::$cacheDir . '/*.cache') ?: [];
            foreach ($files as $file) {
                $data = json_decode(@file_get_contents($file), true);
                if ($data && time() > $data['expires_at']) {
                    @unlink($file);
                }
            }
        }

        public static function set(
            string $key,
            mixed $value,
            ?int $ttl = null
        ): void {
            if ($ttl === null) {
                $ttl = self::$defaultTTL;
            }
            self::init();
            file_put_contents(self::key($key), json_encode([
                'expires_at' => time() + $ttl,
                'value' => $value,
                'key' => $key
            ]), LOCK_EX);

            if (rand(1, 100) <= 5) {
                self::gc();
            }
        }

        public static function forget(string $key): void
        {
            @unlink(self::key($key));
        }

        // Invalidate all cache keys matching a prefix pattern
        public static function forgetPattern(string $prefix): void
        {
            $files = glob(self::$cacheDir . '/*.cache');
            if ($files) {
                foreach ($files as $file) {
                    $data = json_decode(file_get_contents($file), true);
                    if ($data && isset($data['key']) && str_starts_with($data['key'], $prefix)) {
                        @unlink($file);
                    }
                }
            }
        }

        // For health dashboard: count cached items + total size
        public static function stats(): array
        {
            $files = glob(self::$cacheDir . '/*.cache') ?: [];
            $totalSize = array_sum(array_map('filesize', $files));
            $expired = 0;
            foreach ($files as $file) {
                $data = json_decode(file_get_contents($file), true);
                if ($data && time() > $data['expires_at'])
                    $expired++;
            }
            return [
                'total_items' => count($files),
                'expired_items' => $expired,
                'size_kb' => round($totalSize / 1024, 2),
            ];
        }
    }
}
