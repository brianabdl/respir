<?php

namespace App\Domain\Audit\Enums;

enum AuditAction: string
{
    case ConsultationListViewed = 'consultation.list_viewed';
    case ConsultationViewed = 'consultation.viewed';
    case ConsultationUpdated = 'consultation.updated';
    case ConsultationReviewed = 'consultation.reviewed';
    case CaptureDownloaded = 'capture.downloaded';
    case BriefingRequested = 'briefing.requested';
    case ConsentRecorded = 'consultation.consent_recorded';
    case LiveSessionStarted = 'consultation.live_session_started';
    case ConversationContextRetrieved = 'consultation.context_retrieved';
    case CoughAnalysed = 'cough.analysed';
    case BriefingGenerated = 'briefing.generated';
}
