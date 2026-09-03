<?php

namespace App\Core;

/**
 * Minimal dependency-free SMTP mailer (this project has no Composer
 * setup, so no PHPMailer) -- speaks just enough of the SMTP protocol
 * over a raw socket to authenticate and send a plain-text message.
 */
class Mailer
{
    /** @var resource|null */
    private $socket;

    /**
     * Send a plain-text email. Returns false (and logs why) instead of
     * throwing, since a failed/misconfigured mail send should never take
     * down the request that triggered it.
     */
    public function send(string $to, string $subject, string $body): bool
    {
        $config = require __DIR__ . '/../../config/mail.php';

        if (empty($config['host']) || empty($config['username']) || empty($config['password'])) {
            error_log('Mailer: MAIL_* settings are not configured; skipping send.');
            return false;
        }

        $host = $config['host'];
        $port = $config['port'];
        $encryption = strtolower((string) $config['encryption']);
        $username = $config['username'];
        $password = $config['password'];
        $fromName = $config['from_name'];

        $transport = $encryption === 'tls' ? '' : 'ssl://';

        $this->socket = @stream_socket_client(
            "{$transport}{$host}:{$port}",
            $errno,
            $errstr,
            15
        );

        if (!$this->socket) {
            error_log("Mailer: could not connect to {$host}:{$port} ({$errno} {$errstr})");
            return false;
        }

        stream_set_timeout($this->socket, 15);

        try {
            $this->expectMultiline('220');
            $this->command("EHLO {$host}");
            $this->expectMultiline('250');

            if ($encryption === 'tls') {
                $this->command('STARTTLS');
                $this->expect('220');
                stream_socket_enable_crypto($this->socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
                $this->command("EHLO {$host}");
                $this->expectMultiline('250');
            }

            $this->command('AUTH LOGIN');
            $this->expect('334');
            $this->command(base64_encode($username));
            $this->expect('334');
            $this->command(base64_encode($password));
            $this->expect('235');

            $this->command("MAIL FROM:<{$username}>");
            $this->expect('250');
            $this->command("RCPT TO:<{$to}>");
            $this->expect('250');
            $this->command('DATA');
            $this->expect('354');

            $headers = [
                "From: {$fromName} <{$username}>",
                "To: <{$to}>",
                "Subject: {$subject}",
                'MIME-Version: 1.0',
                'Content-Type: text/plain; charset=UTF-8',
                'Date: ' . date('r'),
            ];

            // A lone "." on its own line ends DATA -- escape any line in
            // the body that starts with one so it isn't mistaken for that
            // terminator (RFC 5321 dot-stuffing).
            $escapedBody = preg_replace('/^\./m', '..', $body);

            fwrite(
                $this->socket,
                implode("\r\n", $headers) . "\r\n\r\n" . $escapedBody . "\r\n.\r\n"
            );
            $this->expect('250');

            $this->command('QUIT');

            return true;
        } catch (\RuntimeException $e) {
            error_log('Mailer: ' . $e->getMessage());
            return false;
        } finally {
            fclose($this->socket);
        }
    }

    private function command(string $line): void
    {
        fwrite($this->socket, $line . "\r\n");
    }

    private function expect(string $code): void
    {
        $line = fgets($this->socket, 515);

        if ($line === false || !str_starts_with($line, $code)) {
            throw new \RuntimeException('Unexpected SMTP response: ' . trim((string) $line));
        }
    }

    /**
     * Multi-line SMTP replies (e.g. EHLO's capability list) repeat the
     * code with a "-" separator on every line but the last, which uses
     * a space instead -- keep reading until that final line shows up.
     */
    private function expectMultiline(string $code): void
    {
        while (true) {
            $line = fgets($this->socket, 515);

            if ($line === false || !str_starts_with($line, $code)) {
                throw new \RuntimeException('Unexpected SMTP response: ' . trim((string) $line));
            }

            if (isset($line[3]) && $line[3] === ' ') {
                break;
            }
        }
    }
}
