<?php

namespace App\Modules\EdiFiles\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\EdiFiles\Services\EdiFileService;

class EdiFileController extends Controller
{
    private EdiFileService $service;

    public function __construct()
    {
        $this->service = new EdiFileService();
    }

    /**
     * List uploaded EDI files. ?status= new | archived | all (default new).
     */
    public function index(): void
    {
        $request = new Request();

        $this->success(
            $this->service->list((string) $request->input('status', 'new')),
            'EDI files retrieved successfully.'
        );
    }

    /**
     * Uploads one or more files from the "New Files" tab.
     */
    public function store(): void
    {
        $user = Session::get('user');

        $result = $this->service->upload($this->normalizeFiles(), (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Raw-text preview of one file's contents, for the "EDI File" tab.
     */
    public function preview(): void
    {
        $request = new Request();
        $id = (int) $request->input('id');

        $result = $this->service->preview($id);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success($result['data'], 'File preview retrieved successfully.');
    }

    public function notesIndex(): void
    {
        $request = new Request();
        $id = (int) $request->input('edi_file_id');

        $this->success($this->service->listNotes($id), 'Notes retrieved successfully.');
    }

    public function notesStore(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $result = $this->service->addNote(
            (int) $request->input('edi_file_id'),
            (string) $request->input('note', ''),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Archive/restore toggle for the "Archive" tab. Body: { id, archived }
     */
    public function setArchived(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $result = $this->service->setArchived(
            (int) $request->input('id'),
            (bool) $request->input('archived', true),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * PHP's $_FILES shape for a multi-file <input name="files[]"
     * multiple> field is column-oriented (name/tmp_name/error/... each an
     * array keyed by index), not the row-oriented list every consumer
     * actually wants -- reshape it into one associative array per file.
     */
    private function normalizeFiles(): array
    {
        $raw = (new Request())->files()['files'] ?? null;

        if (!$raw) {
            return [];
        }

        if (!is_array($raw['name'])) {
            return [$raw];
        }

        $files = [];

        foreach ($raw['name'] as $index => $name) {
            $files[] = [
                'name' => $name,
                'type' => $raw['type'][$index] ?? null,
                'tmp_name' => $raw['tmp_name'][$index] ?? null,
                'error' => $raw['error'][$index] ?? UPLOAD_ERR_NO_FILE,
                'size' => $raw['size'][$index] ?? 0
            ];
        }

        return $files;
    }
}
