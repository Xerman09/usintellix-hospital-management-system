<?php

use App\Core\Session;

class AuthMiddleware
{

    public function handle()
    {

        $user = Session::get('user');


        if (!$user) {
            http_response_code(401);
            header('Content-Type: application/json');

            echo json_encode([
                "success" => false,
                "message" => "Unauthorized"
            ]);

            exit;
        }

        // Verify account lifecycle status and remote session revocation
        $userId = (int) ($user['id'] ?? 0);
        $sessId = session_id();
        if ($userId > 0) {
            try {
                $db = \App\Core\Database::connection();

                // Check user account status
                $stmt = $db->prepare("SELECT status, is_locked FROM users WHERE id = :id AND deleted_at IS NULL LIMIT 1");
                $stmt->execute(['id' => $userId]);
                $dbUser = $stmt->fetch(\PDO::FETCH_ASSOC);

                if (!$dbUser || in_array($dbUser['status'], ['suspended', 'decommissioned'], true)) {
                    Session::destroy();
                    http_response_code(403);
                    header('Content-Type: application/json');
                    echo json_encode([
                        "success" => false,
                        "session_revoked" => true,
                        "message" => "Your account has been " . ($dbUser['status'] ?? 'deactivated') . ". Session terminated."
                    ]);
                    exit;
                }

                // Check if this specific session was revoked
                if (!empty($sessId)) {
                    $sStmt = $db->prepare("SELECT is_active, revocation_reason FROM user_session_histories WHERE session_id = :sess_id ORDER BY id DESC LIMIT 1");
                    $sStmt->execute(['sess_id' => $sessId]);
                    $sessionRec = $sStmt->fetch(\PDO::FETCH_ASSOC);
                    if ($sessionRec && (int) $sessionRec['is_active'] === 0) {
                        Session::destroy();
                        http_response_code(401);
                        header('Content-Type: application/json');
                        echo json_encode([
                            "success" => false,
                            "session_revoked" => true,
                            "message" => "Your session has been terminated by an administrator: " . ($sessionRec['revocation_reason'] ?: 'Session revoked.')
                        ]);
                        exit;
                    }

                    // Throttle last_activity update to once every 60 seconds
                    $lastPing = (int) Session::get('_last_activity_ping', 0);
                    if (time() - $lastPing > 60) {
                        Session::put('_last_activity_ping', time());
                        $db->prepare("UPDATE user_session_histories SET last_activity_at = NOW() WHERE session_id = :sess_id AND is_active = 1 LIMIT 1")->execute(['sess_id' => $sessId]);
                    }
                }
            } catch (\Throwable $e) {
                // If DB check fails, fallback to standard authenticated state
            }
        }

        return true;
    }

}