<?php

namespace App\Modules\OrManagement\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Modules\BusinessSettings\Services\BusinessSettingService;
use App\Modules\OrManagement\Services\OrListService;

class OrListController extends Controller
{
    /** Query: date? (YYYY-MM-DD, default today), suite_id? -- the OR list to print */
    public function index(): void
    {
        $request = new Request();
        $list = (new OrListService())->forDate($request->input('date'), (int) $request->input('suite_id') ?: null, true);
        try {
            $biz = (new BusinessSettingService())->get();
        } catch (\Throwable $e) {
            $biz = [];
        }
        $this->success($list + ['hospital' => ['name' => $biz['name'] ?? 'Hospital'], 'printed_at' => date('Y-m-d H:i:s')], 'Retrieved.');
    }
}
