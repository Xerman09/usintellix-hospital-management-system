<?php

namespace App\Modules\SupplierInvoices\Models;

use App\Core\QueryBuilder;

class SupplierInvoiceItem extends QueryBuilder
{
    protected string $table = 'supplier_invoice_items';

    protected string $primaryKey = 'id';
}
