/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { MailMessageDetailDto } from '@raa/assistant/common';

export interface DigestPreset {
  name: string;
  description: string;
}

export interface BootstrapPayload {
  digestPresets: DigestPreset[];
  inboxMessages: MailMessageDetailDto[];
}

export function getBootstrapPayload(): BootstrapPayload {
  return {
    digestPresets: [
      {
        name: 'Today',
        description: 'Summarize the most recent inbox activity and highlight follow-up items.'
      },
      {
        name: 'This week',
        description: 'Produce a weekly digest with deadlines, questions, and action items.'
      },
      {
        name: 'Custom batch',
        description: 'Run a manual digest against a chosen folder and message limit.'
      }
    ],
    inboxMessages: [
      {
        uid: '1001',
        folder: 'INBOX',
        subject: 'Q1 Marketing Campaign Review',
        from: 'Daniel Harper <dharper@companymail.com>',
        receivedAt: '2026-04-14T12:18:00Z',
        preview: 'Requesting feedback on the proposed marketing campaign for Q1. Includes budget breakdown and timeline for social media rollout.',
        bodyText: 'Hi Vasily,\n\nI wanted to get your feedback on the proposed Q1 marketing campaign. Please review the attached budget breakdown and the timeline for our social media rollout.\n\nLet me know if anything needs adjusting before we finalize the plan.\n\nBest,\nDaniel'
      },
      {
        uid: '1002',
        folder: 'INBOX',
        subject: 'Product Demo Feedback',
        from: 'Emily Watson <emily.watson@startup.com>',
        receivedAt: '2026-04-14T11:20:00Z',
        preview: 'Emily was impressed with the demo yesterday. The team has a few follow-up questions regarding API integration and enterprise pricing tiers.',
        bodyText: 'Hi,\n\nThank you for the demo yesterday — the team was really impressed! We have a few follow-up questions about the API integration process and the enterprise pricing tiers. Could we schedule a call to discuss these further?\n\nBest,\nEmily'
      },
      {
        uid: '1003',
        folder: 'INBOX',
        subject: 'Partnership Proposal – AI Integration',
        from: 'Michael Torres <mtorres@techcorp.io>',
        receivedAt: '2026-04-14T12:05:00Z',
        preview: 'Michael is interested in exploring partnership opportunities for integrating our AI platform and suggests scheduling a call next week to discuss potential collaboration.',
        bodyText: 'Hi Vasily,\n\nI am reaching out to explore partnership opportunities for integrating our AI platform into your product suite. I think there is a strong alignment between our technologies. Would you be open to a call next week to discuss collaboration potential?\n\nBest,\nMichael'
      },
      {
        uid: '1004',
        folder: 'INBOX',
        subject: 'Design Assets – Final Review',
        from: 'Sofia Almeida <s.almeida@example.com>',
        receivedAt: '2026-04-14T10:20:00Z',
        preview: 'Sofia attached the final design assets for the dashboard redesign. Please review them and let her know if any revisions are needed before launch.',
        bodyText: 'Hi,\n\nPlease find attached the final design assets for the dashboard redesign. I have incorporated all the feedback from the last review cycle. Please let me know if any further revisions are needed before we proceed to launch.\n\nThanks,\nSofia'
      },
      {
        uid: '1005',
        folder: 'INBOX',
        subject: 'Invoice #2847 – Payment Confirmation',
        from: 'David Martinez <d.martinez@finance.com>',
        receivedAt: '2026-04-14T09:20:00Z',
        preview: 'Payment has been processed successfully. Invoice attached for your records. Net-30 terms applied as per our agreement.',
        bodyText: 'Dear Vasily,\n\nThis is to confirm that payment for Invoice #2847 has been processed successfully. Please find the invoice attached for your records. Net-30 terms have been applied as per our agreement.\n\nBest regards,\nDavid Martinez\nFinance Department'
      },
      {
        uid: '1006',
        folder: 'INBOX',
        subject: 'Budget Approval Request – Q2 Expansion',
        from: 'Olivia Bennett <obennett@fintechlabs.com>',
        receivedAt: '2026-04-13T09:42:00Z',
        preview: 'Requesting approval for the proposed Q2 expansion budget. Includes cost estimates and projected ROI across key channels.',
        bodyText: 'Hi Vasily,\n\nI am writing to request approval for the Q2 expansion budget proposal. The document includes detailed cost estimates and projected ROI across our key growth channels. Your approval would allow us to proceed with vendor negotiations.\n\nThank you,\nOlivia'
      },
      {
        uid: '1007',
        folder: 'INBOX',
        subject: 'Feature Launch Timeline Update',
        from: 'Ethan Collins <ecollins@saascore.io>',
        receivedAt: '2026-04-13T10:58:00Z',
        preview: 'Sharing an updated timeline for the upcoming feature launch. Minor delays due to final QA and performance testing.',
        bodyText: 'Hi team,\n\nI wanted to share an updated timeline for our upcoming feature launch. We have experienced minor delays due to final QA cycles and performance testing. The revised launch window is detailed in the attached document.\n\nEthan'
      },
      {
        uid: '1008',
        folder: 'INBOX',
        subject: 'Content Strategy Proposal',
        from: 'Sophia Martinez <smartinez@marketflow.com>',
        receivedAt: '2026-04-13T12:05:00Z',
        preview: 'Proposing a new content strategy focused on organic growth. Includes blog topics, SEO plan, and publishing schedule.',
        bodyText: 'Hi Vasily,\n\nI have put together a new content strategy focused on organic growth for Q2. The proposal includes a list of blog topics, an SEO improvement plan, and a publishing schedule. I believe this will significantly increase our inbound traffic.\n\nSophia'
      },
      {
        uid: '1009',
        folder: 'INBOX',
        subject: 'API Integration Status',
        from: 'Liam Turner <lturner@devhub.net>',
        receivedAt: '2026-04-13T14:25:00Z',
        preview: 'Providing an update on API integration progress. Core endpoints are complete, with authentication currently in review.',
        bodyText: 'Hi,\n\nJust a quick update on the API integration progress. All core endpoints are now complete and passing tests. The authentication module is currently in code review and should be merged by end of week. Full integration testing is scheduled for next Monday.\n\nLiam'
      },
      {
        uid: '1010',
        folder: 'INBOX',
        subject: 'Customer Feedback Summary',
        from: 'Ava Patel <apatel@cloudsync.ai>',
        receivedAt: '2026-04-13T16:55:00Z',
        preview: 'Summarizing recent customer feedback. Highlights usability concerns and feature requests from enterprise clients.',
        bodyText: 'Hi Vasily,\n\nI have compiled the latest round of customer feedback from our enterprise clients. The summary highlights key usability concerns around the onboarding flow and several recurring feature requests. Happy to walk through these on our next call.\n\nAva'
      }
    ]
  };
}
