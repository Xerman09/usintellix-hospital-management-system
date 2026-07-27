<?php

namespace App\Modules\RelatedPersons\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\RelatedPersons\Services\RelatedPersonService;

class RelatedPersonController extends Controller
{
    private RelatedPersonService $service;

    public function __construct()
    {
        $this->service = new RelatedPersonService();
    }

    /**
     * GET /related-persons?patient_id=
     */
    public function index(): void
    {
        $request = new Request();
        $patientId = (int) $request->input('patient_id');

        $this->success($this->service->list($patientId), 'Related persons retrieved successfully.');
    }

    /**
     * POST /related-persons
     * Body: { patient_id, first_name, middle_name?, last_name, phone?, date_of_birth?, gender?, notes? }
     */
    public function store(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $patientId = (int) $request->input('patient_id');
        $result = $this->service->store($patientId, $request->all(), (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * PUT /related-persons
     * Body: { id, ...basic and/or follow-up fields }
     */
    public function update(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $result = $this->service->update((int) $request->input('id'), $request->all(), (int) $user['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Related person not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * DELETE /related-persons
     * Body: { id }
     */
    public function destroy(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $result = $this->service->remove((int) $request->input('id'), (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }


    /**
     * GET /related-persons/telecoms?related_person_id=
     */
    public function telecomsIndex(): void
    {
        $request = new Request();

        $this->success(
            $this->service->listTelecoms((int) $request->input('related_person_id')),
            'Telecom contacts retrieved successfully.'
        );
    }

    /**
     * POST /related-persons/telecoms
     * Body: { related_person_id, type?, contact_use?, rank_order?, is_primary?, value, active_from?, notes? }
     */
    public function telecomsStore(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $relatedPersonId = (int) $request->input('related_person_id');
        $result = $this->service->storeTelecom($relatedPersonId, $request->all(), (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * PUT /related-persons/telecoms
     * Body: { id, ...fields }
     */
    public function telecomsUpdate(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $result = $this->service->updateTelecom((int) $request->input('id'), $request->all(), (int) $user['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Telecom contact not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * DELETE /related-persons/telecoms
     * Body: { id }
     */
    public function telecomsDestroy(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $result = $this->service->removeTelecom((int) $request->input('id'), (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }


    /**
     * GET /related-persons/addresses?related_person_id=
     */
    public function addressesIndex(): void
    {
        $request = new Request();

        $this->success(
            $this->service->listAddresses((int) $request->input('related_person_id')),
            'Addresses retrieved successfully.'
        );
    }

    /**
     * POST /related-persons/addresses
     * Body: { related_person_id, address_use?, address_type?, start_date?, end_date?, address_line, city?, county_district?, state_province?, postal_code?, country?, priority?, notes? }
     */
    public function addressesStore(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $relatedPersonId = (int) $request->input('related_person_id');
        $result = $this->service->storeAddress($relatedPersonId, $request->all(), (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * PUT /related-persons/addresses
     * Body: { id, ...fields }
     */
    public function addressesUpdate(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $result = $this->service->updateAddress((int) $request->input('id'), $request->all(), (int) $user['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Address not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * DELETE /related-persons/addresses
     * Body: { id }
     */
    public function addressesDestroy(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $result = $this->service->removeAddress((int) $request->input('id'), (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
