<?php

namespace App\Modules\SupplierInvoices\Models;

use App\Core\QueryBuilder;

class SupplierInvoice extends QueryBuilder
{
    protected string $table = 'supplier_invoices';

    protected string $primaryKey = 'id';
}
