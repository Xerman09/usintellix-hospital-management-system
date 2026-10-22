<?php

namespace App\Modules\MyChart\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Modules\MyChart\Services\PortalShareService;

/**
 * The outside doctor's end of a shared link.
 *
 * This is the one endpoint in My Chart with no login behind it, because the person
 * reading it has no account here. The token is the whole of the authorisation, so:
 * it is 32 random bytes, it is checked against its expiry and its revocation on
 * every hit, it only ever yields the sections the patient ticked, and every hit --
 * including the refused ones -- is written down for the patient to see.
 */
class RecordShareController extends Controller
{
    /** GET /record-share/open?token= */
    public function open(): void
    {
        $request = new Request();
        $result = PortalShareService::open((string) $request->input('token', ''));

        if (empty($result['success'])) {
            // 200 with a state, not 404: the page shows the patient's visitor a plain
            // sentence, and a wrong token is never distinguishable from a dead one.
            $this->json([
                'success' => false,
                'message' => $result['message'],
                'data' => ['state' => $result['state'] ?? 'unknown'],
            ], 200);
            return;
        }

        $this->success($result['data'], $result['message']);
    }
}
