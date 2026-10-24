<?php

namespace App\Modules\Radiology\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Modules\Radiology\Services\RisPacsService;
use Throwable;

class RisPacsController
{
    private RisPacsService $service;

    public function __construct()
    {
        $this->service = new RisPacsService();
    }

    public function search(Request $request): Response
    {
        try {
            $filters = [
                'patient_id' => $request->query('patient_id'),
                'modality' => $request->query('modality'),
                'study_date' => $request->query('study_date'),
                'q' => $request->query('q')
            ];

            $studies = $this->service->searchStudies($filters);
            return Response::json(['success' => true, 'data' => $studies]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function study(Request $request): Response
    {
        try {
            $studyUid = $request->query('study_uid');
            $orderId = (int) $request->query('order_id');

            if (!empty($studyUid)) {
                $study = $this->service->getStudyByUid($studyUid);
                if (!$study) {
                    return Response::json(['success' => false, 'message' => 'PACS study not found.'], 404);
                }
                return Response::json(['success' => true, 'data' => $study]);
            }

            if ($orderId > 0) {
                $res = $this->service->getOrCreateStudy($orderId);
                return Response::json($res, ($res['success'] ?? false) ? 200 : 400);
            }

            return Response::json(['success' => false, 'message' => 'Study Instance UID or Order ID required.'], 400);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
