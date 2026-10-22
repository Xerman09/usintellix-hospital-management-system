<?php

namespace App\Modules\MyChart\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\MyChart\Services\PortalAudit;
use App\Modules\MyChart\Services\PortalProxyService;

/**
 * The staff queue for proxy access requests: someone asking to see another
 * patient's record, and the decision on it.
 *
 * Kept out of MyChartController, which holds only the patient-facing actions and
 * never takes a patient from the request.
 */
class ProxyRequestController extends Controller
{
    /** GET /proxy-requests?status=pending|approved|denied|revoked|all */
    public function index(): void
    {
        $request = new Request();

        $this->success(
            PortalProxyService::queue((string) $request->input('status', 'pending')),
            'Requests retrieved successfully.'
        );
    }

    /** POST /proxy-requests/decide -- Body: id, decision (approve|deny), reason */
    public function decide(): void
    {
        $user = Session::get('user');
        $request = new Request();
        $id = (int) $request->input('id');

        $result = PortalProxyService::decide(
            $id,
            (string) $request->input('decision', ''),
            (string) $request->input('reason', ''),
            (int) ($user['id'] ?? 0)
        );

        if (!empty($result['success'])) {
            PortalAudit::action($user, null, 'Proxy Access Decided',
                'Request #' . $id . ': ' . ($result['data']['status'] ?? '') . '. ' . ($result['message'] ?? ''));
        }

        if (empty($result['success'])) {
            $code = !empty($result['not_found']) ? 404 : 422;
            $this->json(['success' => false, 'message' => $result['message'] ?? 'That did not work.',
                'errors' => $result['errors'] ?? null], $code);
            return;
        }

        $this->success($result['data'] ?? null, $result['message']);
    }
}
