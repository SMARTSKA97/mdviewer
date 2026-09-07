import { describe, beforeEach, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { App } from './app';
import { MarkdownService } from './core/services/markdown.service';

try {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // Already initialized
}

const userMarkdown = `# Master Technical Integration Specification: E-Voucher & External Systems

**Document Version**: 2.0  
**Target Audience**: External System Developers (WBJIT, Treasury Portal, Administrative Departments, Autonomous Agencies)  
**Supported Protocols**: RabbitMQ (AMQP 0-9-1) & REST API (HTTP/HTTPS)  

---

## 1. Architectural Overview & Integration Model

The ** E-Voucher System ** supports **bidirectional, multi-protocol integration** with external applications. External systems can choose between **RabbitMQ** (asynchronous message queuing) and **REST API** (synchronous HTTP webhooks/endpoints) according to their architectural requirements.

\`\`\`mermaid
graph LR
    subgraph External Applications
        ExtRMQ[External Publisher/Consumer<br/>via RabbitMQ]
        ExtAPI[External Client/Webhook<br/>via REST API]
    end

    subgraph E-Voucher System
        RMQLayer[RabbitMQ Ingestion & Publisher]
        APILayer[REST API Controller Layer]
        CoreEngine[Unified Processing Engine<br/>- FluentValidation<br/>- PostgreSQL CTE Stored Procs<br/>- Audit & ACK Tracking]
    end

    ExtRMQ <-->|AMQP Exchanges / Queues| RMQLayer
    ExtAPI <-->|HTTP POST / GET| APILayer
    RMQLayer --> CoreEngine
    APILayer --> CoreEngine
\`\`\`

---

## 2. Prerequisites & Global Standards

### 2.1 Identification, Tracing & Idempotency
Every transaction across both RabbitMQ and REST API **must** supply a unique GUID identifier:
- **\`MessageId\` (UUID/GUID)**: Used for end-to-end tracing, duplicate prevention (idempotency), and mapping return acknowledgements.
- **\`CorrelationId\` (UUID/GUID, Optional)**: Cross-system workflow tracking identifier.
- **\`AppId\` / Client Identification**: Identifier of the calling application (e.g. \`68\` for E-Invoice, \`WBJIT\`, \`TREASURY\`).

### 2.2 Global Acknowledgement Format (\`AckPayloadModel\`)
All operations (both RabbitMQ return ACKs and HTTP responses) return the standardized feedback model:

\`\`\`json
{
  "MessageId": "71e1c9c4-b53f-42e9-b25f-18fafd23dbd7",
  "Status": "SUCCESS",
  "StatusMsg": "Message Consumed Successfully.",
  "FailedType": null,
  "Timestamp": "2026-08-13T10:30:00Z"
}
\`\`\`

#### Failure ACK/NACK Categories (\`FailedType\`):
| \`FailedType\` | Description | Typical HTTP Status |
| :--- | :--- | :--- |
| \`Deserialization\` | JSON formatting error, data type mismatch, or null body. | \`400 Bad Request\` |
| \`MessageIdMissing\` | \`MessageId\` header/property is missing or not a valid GUID. | \`400 Bad Request\` |
| \`ValidationFailure\` | Constraint violation (e.g. missing required field, negative amount). | \`422 Unprocessable Entity\` |
| \`ProcessingError\` | Database constraint, double-booking, or business rule violation. | \`400 Bad Request\` |
| \`SystemError\` | Unhandled runtime or connectivity exception. | \`500 Internal Server Error\` |

---

## 3. Inbound Integration: External Systems $\\rightarrow$ E-Voucher

---

### 3.1 Event 1: Invoice Consumption

**Business Purpose**: Dispatched when an e-voucher/invoice is partially or fully consumed against a Financial Transfer Order (FTO). E-Voucher validates the invoice balance, updates cumulative consumed amounts, and records the booking.

#### A. RabbitMQ Implementation
- **Target Queue**: \`wbjit_einvoice_invoice_consumption\`
- **Exchange**: Default direct routing (or Direct Exchange)
- **Message Properties**:
  - \`MessageId\`: \`<Unique-GUID>\` *(Required)*
  - \`ReplyTo\`: \`wbjit_einvoice_invoice_consumption_ack\` *(Required)*
  - \`DeliveryMode\`: \`2\` (Persistent)
  - \`AppId\`: \`<Your-App-ID>\`
- **Payload Schema**:
\`\`\`json
{
  "FtoNo": "FTO-2026-000188",
  "CreatedDate": "2026-08-13T10:15:00Z",
  "CreatedBy": "1001",
  "Invoices": [
    {
      "InvoiceId": "2b7ef691-b94e-4946-8853-dab78b6a8a31",
      "Amount": 50000.00
    },
    {
      "InvoiceId": "a6730abb-9cd3-4d38-b0ec-7cc58af4786b",
      "Amount": 12500.00
    }
  ]
}
\`\`\`

#### B. REST API Implementation
- **Endpoint**: \`POST /api/v1/integration/wbjit/invoice-consumption\`
- **Headers**:
  - \`Content-Type\`: \`application/json\`
  - \`X-Message-Id\`: \`71e1c9c4-b53f-42e9-b25f-18fafd23dbd7\` *(Required)*
  - \`X-Correlation-Id\`: \`f47ac10b-58cc-4372-a567-0e02b2c3d479\` *(Optional)*
  - \`X-App-Id\`: \`WBJIT\` *(Optional)*
  - \`X-Api-Key\`: \`<Your-Api-Key>\` *(If configured)*
- **Request Body**: Same JSON payload as above.

#### C. Responses & Error Scenarios

##### Success (HTTP 200 OK / RabbitMQ Success ACK)
\`\`\`json
{
  "MessageId": "71e1c9c4-b53f-42e9-b25f-18fafd23dbd7",
  "Status": "SUCCESS",
  "StatusMsg": "Message Consumed Successfully.",
  "FailedType": null,
  "Timestamp": "2026-08-13T10:15:02Z"
}
\`\`\`

##### Validation Failure (HTTP 422 Unprocessable Entity / RabbitMQ Validation NACK)
\`\`\`json
{
  "MessageId": "71e1c9c4-b53f-42e9-b25f-18fafd23dbd7",
  "Status": "FAILED",
  "StatusMsg": "Validation failed: [FtoNo: FtoNo is required.], [Invoices[0].Amount: Amount must be greater than 0.]",
  "FailedType": "ValidationFailure",
  "Timestamp": "2026-08-13T10:15:02Z"
}
\`\`\`

##### Business Rule / Over-Consumption Error (HTTP 400 Bad Request / RabbitMQ Processing Error)
\`\`\`json
{
  "MessageId": "71e1c9c4-b53f-42e9-b25f-18fafd23dbd7",
  "Status": "FAILED",
  "StatusMsg": "Database procedure proc_invoice_consumption failed: Booked amount exceeds the total invoice amount for InvoiceId: 2b7ef691-b94e-4946-8853-dab78b6a8a31",
  "FailedType": "ProcessingError",
  "Timestamp": "2026-08-13T10:15:02Z"
}
\`\`\`

---

### 3.2 Event 2: FTO Status Update

**Business Purpose**: Dispatched by Treasury, JIT, or external portals when the processing status of a bill/voucher changes (e.g. Approved, Rejected, Tokenized, Disbursed). 

> [!TIP]
> **Multi-Identifier Tracking (FTO vs. RefNo Support)**:
> External applications may track transactions using different reference keys:
> - **App A (e.g., WBJIT)**: Identifies bookings via **\`JitRefNo\` / \`FtoNo\`** (e.g. \`2026000187689977\`).
> - **App B (e.g., Treasury Portal / e-Billing)**: Identifies bookings via **\`BillRefNo\` / \`RefNo\`** (e.g. \`BILL-2026-091\`) or **\`UniqueRefId\`** (e.g. \`TXN-REF-8899\`).
>
> The E-Voucher backend dynamically resolves the target booking using whichever key is provided. At least one identifier (\`JitRefNo\`, \`BillRefNo\`, or \`UniqueRefId\`) must be supplied.

#### A. RabbitMQ Implementation
- **Exchange Name**: \`wbjit_fto_ebill_status\`
- **Exchange Type**: \`Fanout\` / \`Direct\`
- **Target Queue**: \`wbjit_einvoice_fto_status\`
- **Message Properties**:
  - \`MessageId\`: \`<Unique-GUID>\` *(Required)*
  - \`ReplyTo\`: \`wbjit_einvoice_fto_status_ack\` *(Required)*
- **Payload Schema - Option 1 (App A: FTO-based payload)**:
\`\`\`json
{
  "BillId": 987654,
  "JitRefNo": "2026000187689977",
  "BillRefNo": null,
  "FtoStatus": 1,
  "EbillStatus": 2,
  "CreatedAt": "2026-08-13T10:20:00Z",
  "Remarks": "FTO successfully approved and cleared by Treasury",
  "TokenNo": 887766,
  "TokenDate": "2026-08-13T10:18:00Z",
  "SlsCode": "SLS001",
  "UniqueRefId": "1001"
}
\`\`\`

- **Payload Schema - Option 2 (App B: RefNo / UniqueRefId-based payload)**:
\`\`\`json
{
  "BillId": 987654,
  "JitRefNo": null,
  "BillRefNo": "BILL-2026-091",
  "FtoStatus": 1,
  "EbillStatus": 2,
  "CreatedAt": "2026-08-13T10:20:00Z",
  "Remarks": "Bill Reference status updated",
  "TokenNo": 887766,
  "TokenDate": "2026-08-13T10:18:00Z",
  "SlsCode": "SLS001",
  "UniqueRefId": "TXN-REF-8899"
}
\`\`\`

#### B. REST API Implementation
- **Endpoint**: \`POST /api/v1/integration/wbjit/fto-status\`
- **Virtual Exchange Route**: \`POST /api/v1/integration/exchange/wbjit_fto_ebill_status\`
- **Headers**: \`X-Message-Id: <GUID>\`
- **Request Body**: Accepts either Option 1 (FTO-based) or Option 2 (RefNo-based).

#### C. Universal Status Inquiry Endpoint (Check Status API)
External applications can query the real-time status of vouchers/bookings using their own preferred identifier key:

- **Endpoint**: \`GET /api/v1/integration/vouchers/status\`
- **Supported Query Parameters** (Provide any one):
  - \`?ftoNo=2026000187689977\` *(App A lookup)*
  - \`?billRefNo=BILL-2026-091\` *(App B lookup)*
  - \`?uniqueRefId=TXN-REF-8899\` *(Custom transaction ref lookup)*
  - \`?evoucherNumber=EV-2026-000189\` *(E-Voucher number lookup)*
  - \`?invoiceId=2b7ef691-b94e-4946-8853-dab78b6a8a31\` *(UUID lookup)*

- **Sample Status Response (HTTP 200 OK)**:
\`\`\`json
{
  "Status": "SUCCESS",
  "Result": {
    "FtoNo": "2026000187689977",
    "BillRefNo": "BILL-2026-091",
    "UniqueRefId": "TXN-REF-8899",
    "EvoucherNumber": "EV-2026-000189",
    "CurrentFtoStatus": 1,
    "CurrentEbillStatus": 2,
    "StatusDescription": "Approved by Treasury",
    "TotalBookedAmount": 50000.00,
    "TotalExpenditureAmount": 0.00,
    "IsFullyConsumed": false,
    "LastUpdated": "2026-08-13T10:20:00Z"
  }
}
\`\`\`

#### D. Responses & Error Scenarios

##### Success (HTTP 200 OK / Success ACK)
\`\`\`json
{
  "MessageId": "8b51d6c8-90f3-42e7-a72d-88fafd36ab32",
  "Status": "SUCCESS",
  "StatusMsg": "Message Consumed Successfully.",
  "FailedType": null,
  "Timestamp": "2026-08-13T10:20:01Z"
}
\`\`\`

##### Booking Not Found Error (HTTP 400 Bad Request / Processing Error)
\`\`\`json
{
  "MessageId": "8b51d6c8-90f3-42e7-a72d-88fafd36ab32",
  "Status": "FAILED",
  "StatusMsg": "Database procedure proc_update_fto_status failed: No bookings found for reference: BILL-2026-091",
  "FailedType": "ProcessingError",
  "Timestamp": "2026-08-13T10:20:01Z"
}
\`\`\`

---

### 3.3 Event 3: Agency & SLS Scheme Mapping Sync

**Business Purpose**: Synchronizes active JIT Agency master profiles, Scheme Logic System (SLS) scheme codes, and their relationships to E-Voucher dynamically.

#### A. RabbitMQ Implementation
- **Exchange Name**: \`wbjit_agency_sls_exchange\`
- **Exchange Type**: \`Fanout\`
- **Target Queue**: \`wbjit_agency_sls_exchange\` (or \`wbjit_einvoice_agency_sls_details\`)
- **Message Properties**:
  - \`MessageId\`: \`<Unique-GUID>\` *(Required)*
  - \`ReplyTo\`: \`wbjit_um_sls_agency_ack\` *(Required)*
- **Payload Schema (Batch Mapping)**:
\`\`\`json
{
  "Mappings": [
    {
      "AgencyCode": "WBJG00000580",
      "AgencyName": "Jhargram Zilla Parishad",
      "Address1": "Dubra Office Complex",
      "Address2": "Jhargram District",
      "PhoneNo": "9876543210",
      "SlsCode": "SLS001",
      "SlsName": "State Development Scheme 1",
      "CreatedBy": 1
    },
    {
      "AgencyCode": "WBBI00005768",
      "AgencyName": "Suri Development Agency",
      "Address1": "Suri Main Road",
      "Address2": "Birbhum",
      "PhoneNo": "9876543211",
      "SlsCode": "SLS002",
      "SlsName": "State Development Scheme 2",
      "CreatedBy": 1
    }
  ]
}
\`\`\`

#### B. REST API Implementation
- **Endpoint**: \`POST /api/v1/integration/wbjit/agency-sls\`
- **Virtual Exchange Route**: \`POST /api/v1/integration/exchange/wbjit_agency_sls_exchange\`
- **Headers**: \`X-Message-Id: <GUID>\`
- **Request Body**: Same JSON payload as above.

#### C. Responses & Error Scenarios

##### Success (HTTP 200 OK / Success ACK)
\`\`\`json
{
  "MessageId": "c4d5e6f7-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
  "Status": "SUCCESS",
  "StatusMsg": "Message Consumed Successfully.",
  "FailedType": null,
  "Timestamp": "2026-08-13T10:25:00Z"
}
\`\`\`

##### Validation Failure (HTTP 422 Unprocessable Entity)
\`\`\`json
{
  "MessageId": "c4d5e6f7-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
  "Status": "FAILED",
  "StatusMsg": "Validation failed: [Mappings[0].AgencyName: AgencyName is required.]",
  "FailedType": "ValidationFailure",
  "Timestamp": "2026-08-13T10:25:00Z"
}
\`\`\`

---

### 3.4 Event 4: Scheme Configuration Sync

**Business Purpose**: Synchronizes Central Sector Scheme (CSS) and State Scheme Logic parameters, state/center sharing ratios, DBT indicators, and State Government account details.

#### A. RabbitMQ Implementation
- **Exchange Name**: \`wbjit_scheme_config_exchange\`
- **Exchange Type**: \`Fanout\`
- **Target Queue**: \`wbjit_scheme_config_exchange\`
- **Message Properties**:
  - \`MessageId\`: \`<Unique-GUID>\` *(Required)*
  - \`ReplyTo\`: \`wbjit_um_sls_agency_ack\` *(Required)*
- **Payload Schema**:
\`\`\`json
{
  "IsDBT": true,
  "topup": "Y",
  "csscode": "9151",
  "cssname": "SBM-RURAL (DWS)",
  "modelno": "1",
  "slscode": "WB62",
  "slsname": "WB NIRMAL BHARAT ABHIYAN",
  "statecd": "19",
  "entrydate": "2026-08-13T00:00:00",
  "fiscal_year": 2627,
  "scheme_type": "0",
  "sls_category": "100",
  "DBTMissonCode": "TRT-0091",
  "queueUniqueId": "0f6bf1bd-a185-414c-b14f-9a4019b9652b",
  "stateshareper": 40,
  "centershareper": 60,
  "controllercode": "115",
  "sgaccountnumber": "01516701263"
}
\`\`\`

#### B. REST API Implementation
- **Endpoint**: \`POST /api/v1/integration/wbjit/scheme-config\`
- **Virtual Exchange Route**: \`POST /api/v1/integration/exchange/wbjit_scheme_config_exchange\`
- **Headers**: \`X-Message-Id: <GUID>\`
- **Request Body**: Same JSON payload as above.

#### C. Responses & Error Scenarios

##### Success (HTTP 200 OK / Success ACK)
\`\`\`json
{
  "MessageId": "0f6bf1bd-a185-414c-b14f-9a4019b9652b",
  "Status": "SUCCESS",
  "StatusMsg": "Message Consumed Successfully.",
  "FailedType": null,
  "Timestamp": "2026-08-13T10:30:00Z"
}
\`\`\`

---

## 4. Outbound Integration: E-Voucher $\\rightarrow$ External Systems

When an e-voucher is finalized, approved, and digitally e-signed in E-Voucher, the system exports the complete voucher metadata and document reference to external systems.

\`\`\`mermaid
sequenceDiagram
    autonumber
    participant EVoucher as E-Voucher System
    participant RMQ as RabbitMQ Queue (einvoice_wbjit_fto_voucher_details)
    participant Webhook as External REST Webhook
    actor ExtApp as External System (WBJIT / Treasury)

    EVoucher->>EVoucher: Voucher Generated & E-Signed
    
    alt Integration Channel: RabbitMQ
        EVoucher->>RMQ: Publish Voucher Message (Persistent, replyTo)
        RMQ->>ExtApp: Deliver to External Consumer
        ExtApp->>ExtApp: Process & Store Voucher
        ExtApp->>EVoucher: Publish ACK to einvoice_wbjit_fto_voucher_details_ack
    else Integration Channel: REST Webhook
        EVoucher->>Webhook: POST /api/vouchers/receive (Voucher Payload)
        Webhook->>ExtApp: Process Voucher
        ExtApp-->>EVoucher: HTTP 200 OK + AckPayloadModel (Synchronous ACK)
    end
\`\`\`

### 4.1 Voucher Payload Export Schema

This is the payload dispatched by E-Voucher:

\`\`\`json
{
  "id": "2b7ef691-b94e-4946-8853-dab78b6a8a31",
  "evoucherNumber": "EV-2026-000189",
  "agencyId": "WBJG00000580",
  "SlsCode": "SLS001",
  "payeeName": "M/S InfraTech Solutions Ltd",
  "accountNumber": "987654321012",
  "totalAmount": 150000.00,
  "consumedAmount": 0.00,
  "voucherDate": "2026-08-13",
  "documentId": "4a1c5e7b-c39f-4318-910a-cb849d28ea90",
  "description": "Payment for civil infrastructure maintenance",
  "authorityName": "Executive Engineer, PWD"
}
\`\`\`

#### Field Specifications:
| Field Name | Type | Description |
| :--- | :--- | :--- |
| \`id\` | \`UUID\` | Primary unique voucher ID in E-Voucher. |
| \`evoucherNumber\` | \`String\` | Formatted voucher tracking number. |
| \`agencyId\` | \`String\` | Target JIT agency identifier code. |
| \`SlsCode\` | \`String\` | Mapped SLS scheme identifier code. |
| \`payeeName\` | \`String\` | Legal name of vendor/beneficiary. |
| \`accountNumber\` | \`String\` | Vendor bank account number. |
| \`totalAmount\` | \`Decimal\` | Total authorized expenditure amount. |
| \`consumedAmount\` | \`Decimal\` | Amount consumed to date (initially \`0.00\`). |
| \`voucherDate\` | \`Date\` | Issue date (\`YYYY-MM-DD\`). |
| \`documentId\` | \`UUID\` | Storage document identifier for downloading the signed PDF. |
| \`description\` | \`String\` | Sanction/expenditure description remarks. |
| \`authorityName\` | \`String\` | Designation/Name of issuing authority. |

---

### 4.2 Handling Outbound via RabbitMQ
1. **Target Queue**: \`einvoice_wbjit_fto_voucher_details\`
2. **ReplyTo Queue**: \`einvoice_wbjit_fto_voucher_details_ack\`
3. **Consumer Action**:
   - External application consumes from \`einvoice_wbjit_fto_voucher_details\`.
   - Sends \`BasicAck\` to the broker.
   - Publishes an ACK payload back to \`einvoice_wbjit_fto_voucher_details_ack\`:
     \`\`\`json
     {
       "MessageId": "2b7ef691-b94e-4946-8853-dab78b6a8a31",
       "Status": "SUCCESS",
       "StatusMsg": "Voucher stored and mapped successfully.",
       "FailedType": null,
       "Timestamp": "2026-08-13T10:35:00Z"
     }
     \`\`\`

---

### 4.3 Handling Outbound via REST API

#### Option A: Webhook Push (Recommended)
- **External System Requirement**: Expose a receiving endpoint, e.g. \`POST https://your-domain.gov.in/api/v1/vouchers/receive\`.
- **E-Voucher Action**: Dispatches an HTTP \`POST\` with the voucher payload and \`X-Message-Id: <VoucherId>\`.
- **Expected External Response**: Return \`HTTP 200 OK\` with JSON:
  \`\`\`json
  {
    "MessageId": "2b7ef691-b94e-4946-8853-dab78b6a8a31",
    "Status": "SUCCESS",
    "StatusMsg": "Voucher registered successfully.",
    "Timestamp": "2026-08-13T10:35:00Z"
  }
  \`\`\`

#### Option B: Pull Polling (For Restricted Network Ingestion)
If your application cannot receive inbound webhooks, you can poll E-Voucher for pending vouchers:
1. **Get Pending Vouchers**:
   - \`GET /api/v1/integration/wbjit/vouchers/pending?agencyId=WBJG00000580&limit=50\`
   - Returns an array of pending \`EVoucherPayload\` objects.
2. **Acknowledge Processed Vouchers**:
   - \`POST /api/v1/integration/wbjit/vouchers/ack\`
   - Request Body:
     \`\`\`json
     {
       "ProcessedIds": [
         "2b7ef691-b94e-4946-8853-dab78b6a8a31",
         "a6730abb-9cd3-4d38-b0ec-7cc58af4786b"
       ],
       "Status": "SUCCESS",
       "AcknowledgedBy": "WBJIT-Sync-Worker"
     }
     \`\`\`

---

## 5. End-to-End Testing & Verification

### 5.1 Testing via cURL (REST API)

\`\`\`bash
# 1. Test Invoice Consumption
curl -X POST "https://evoucher-api.wb.gov.in/api/v1/integration/wbjit/invoice-consumption" \\
  -H "Content-Type: application/json" \\
  -H "X-Message-Id: d9e8a7b6-c5d4-4e3f-2a1b-0c9d8e7f6a5b" \\
  -d '{
    "FtoNo": "FTO-TEST-001",
    "CreatedDate": "2026-08-13T10:00:00Z",
    "CreatedBy": "1001",
    "Invoices": [
      {
        "InvoiceId": "2b7ef691-b94e-4946-8853-dab78b6a8a31",
        "Amount": 10000.00
      }
    ]
  }'

# 2. Test FTO Status Update
curl -X POST "https://evoucher-api.wb.gov.in/api/v1/integration/wbjit/fto-status" \\
  -H "Content-Type: application/json" \\
  -H "X-Message-Id: a1b2c3d4-e5f6-4a5b-6c7d-8e9f0a1b2c3d" \\
  -d '{
    "BillId": 12345,
    "JitRefNo": "FTO-TEST-001",
    "FtoStatus": 1,
    "Remarks": "Treasury approved",
    "CreatedAt": "2026-08-13T10:05:00Z",
    "UniqueRefId": "1001"
  }'
\`\`\`

### 5.2 Testing via RabbitMQ Management UI
1. Navigate to RabbitMQ Management UI (\`http://<host>:15672\`).
2. Go to **Exchanges** or **Queues**.
3. Select target exchange (e.g. \`wbjit_agency_sls_exchange\`).
4. Click **Publish message**:
   - **Properties**: \`message_id=<unique-guid>\`, \`reply_to=wbjit_um_sls_agency_ack\`, \`delivery_mode=2\`
   - **Payload**: Paste the JSON payload.
5. Check your reply queue (e.g. \`wbjit_um_sls_agency_ack\`) to verify the return ACK payload.

---

## 6. Summary Matrix for Developers

| Operation | Direction | Protocol | Exchange / URL Endpoint | Payload Model |
| :--- | :--- | :--- | :--- | :--- |
| **Invoice Consumption** | Inbound ($\\rightarrow$) | RabbitMQ | Queue: \`wbjit_einvoice_invoice_consumption\` | \`InvoiceConsumptionMessage\` |
| **Invoice Consumption** | Inbound ($\\rightarrow$) | REST API | \`POST /api/v1/integration/wbjit/invoice-consumption\` | \`InvoiceConsumptionMessage\` |
| **FTO Status Update** | Inbound ($\\rightarrow$) | RabbitMQ | Exchange: \`wbjit_fto_ebill_status\` | \`EbillingJitBillStatusAnotherModuel\` |
| **FTO Status Update** | Inbound ($\\rightarrow$) | REST API | \`POST /api/v1/integration/wbjit/fto-status\` | \`EbillingJitBillStatusAnotherModuel\` |
| **Agency SLS Sync** | Inbound ($\\rightarrow$) | RabbitMQ | Exchange: \`wbjit_agency_sls_exchange\` | \`AgencySlsDetailsBatchMessage\` |
| **Agency SLS Sync** | Inbound ($\\rightarrow$) | REST API | \`POST /api/v1/integration/wbjit/agency-sls\` | \`AgencySlsDetailsBatchMessage\` |
| **Scheme Config Sync** | Inbound ($\\rightarrow$) | RabbitMQ | Exchange: \`wbjit_scheme_config_exchange\` | \`PFMSSchemeConfigMessage\` |
| **Scheme Config Sync** | Inbound ($\\rightarrow$) | REST API | \`POST /api/v1/integration/wbjit/scheme-config\` | \`PFMSSchemeConfigMessage\` |
| **Voucher Push** | Outbound ($\\leftarrow$) | RabbitMQ | Queue: \`einvoice_wbjit_fto_voucher_details\` | \`EVoucherPayload\` |
| **Voucher Push** | Outbound ($\\leftarrow$) | REST API | Webhook: \`POST {ClientUrl}/api/vouchers/receive\` | \`EVoucherPayload\` |
| **Voucher Polling** | Outbound ($\\leftarrow$) | REST API | \`GET /api/v1/integration/wbjit/vouchers/pending\` | Returns \`EVoucherPayload[]\` |
| **Universal Status Inquiry** | Inbound ($\\rightarrow$) | REST API | \`GET /api/v1/integration/vouchers/status?ftoNo=...\` OR \`?billRefNo=...\` | Returns booking/voucher status |
`;

describe('App & Markdown Pipeline', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the full user document without any unparsed markdown artifacts', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const markdownService = TestBed.inject(MarkdownService);

    const html = markdownService.render(userMarkdown);
    expect(html).toBeTruthy();

    // 1. Verify Section 3.3 A is a proper header with list items
    expect(html).toContain('id="a-rabbitmq-implementation"');
    expect(html).toContain('A. RabbitMQ Implementation');
    expect(html).toContain('<li><strong>Exchange Name</strong>: <code>wbjit_agency_sls_exchange</code></li>');
    expect(html).toContain('<li><strong>Exchange Type</strong>: <code>Fanout</code></li>');
    expect(html).toContain('<li><strong>Target Queue</strong>: <code>wbjit_agency_sls_exchange</code>');
    expect(html).toContain('<li><strong>Message Properties</strong>:');
    expect(html).toContain('<code>MessageId</code>: <code>&lt;Unique-GUID&gt;</code>');
    expect(html).toContain('<code>ReplyTo</code>: <code>wbjit_um_sls_agency_ack</code>');
    expect(html).toContain('&lt;Your-App-ID&gt;');
    expect(html).toContain('&lt;Your-Api-Key&gt;');

    // 2. Verify no remaining literal ** in content text
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    tempDiv.querySelectorAll('code, pre, script, style').forEach(el => el.remove());
    const visibleText = tempDiv.textContent || '';
    
    // Count literal ** in visible text
    const literalAsterisks = (visibleText.match(/\*\*/g) || []).length;
    expect(literalAsterisks).toBe(0);

    // Count literal unicode bullet glyphs
    const unicodeBullets = (visibleText.match(/[•▪▫◦‣⁃∙●★✓✔►▶–—·○◆◇■□➢➜]/g) || []).length;
    expect(unicodeBullets).toBe(0);
  });
});
