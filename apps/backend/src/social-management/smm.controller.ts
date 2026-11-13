import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  ForbiddenException,
  UseFilters,
  Catch,
  ArgumentsHost,
  ExceptionFilter,
} from '@nestjs/common';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { z } from 'zod';
import { SmmService, verifySignature } from './smm.service';
import { SmmStore } from './smm.store';
import {
  automationSchema,
  contentSchema,
  metricSchema,
  runSchema,
  sourceSchema,
  workspaceSchema,
} from './smm.schemas';
import { previewBrandImport } from './smm.brand-import';
import { Request, Response } from 'express';

@Catch(z.ZodError)
export class SmmValidationFilter implements ExceptionFilter {
  catch(error: z.ZodError, host: ArgumentsHost) {
    host
      .switchToHttp()
      .getResponse()
      .status(400)
      .json({
        message: error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; '),
      });
  }
}
@Controller('/social-management')
@UseFilters(SmmValidationFilter)
export class SmmController {
  constructor(private service: SmmService, private store: SmmStore) {}
  @Get() state(@GetOrgFromRequest() org: Organization) {
    return this.service.state(org.id);
  }
  @Put('/workspace') workspace(
    @GetOrgFromRequest() org: Organization,
    @Body() body: unknown
  ) {
    const p = z
      .object({
        data: workspaceSchema,
        revision: z.number().int().nonnegative(),
        confirmAutoReplies: z.boolean().default(false),
      })
      .parse(body);
    return this.service.saveWorkspace(
      org.id,
      p.data,
      p.revision,
      p.confirmAutoReplies
    );
  }
  @Post('/brand/import-preview') importBrand(@Body() body: unknown) {
    const p = z
      .object({
        filename: z.string().min(1).max(250),
        text: z.string().min(1).max(60000),
      })
      .parse(body);
    return previewBrandImport(p.filename, p.text);
  }
  @Get('/skills/:id') skill(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this.service.skill(org.id, id);
  }
  @Post('/skills') createSkill(
    @GetOrgFromRequest() org: Organization,
    @Body() body: unknown
  ) {
    return this.service.createSkill(org.id, body);
  }
  @Post('/research/auto') autoResearch(
    @GetOrgFromRequest() org: Organization,
    @Body() body: unknown
  ) {
    const p = z
      .object({ focus: z.string().trim().max(2000).default('') })
      .parse(body);
    return this.service.autoResearch(org.id, p.focus);
  }
  @Post('/sources') source(
    @GetOrgFromRequest() org: Organization,
    @Body() body: unknown
  ) {
    return this.service.source(org.id, sourceSchema.parse(body));
  }
  @Post('/sources/:id/refresh') refresh(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this.service.refreshSource(org.id, id);
  }
  @Post('/runs') run(
    @GetOrgFromRequest() org: Organization,
    @Body() body: unknown
  ) {
    return this.service.enqueue(org.id, runSchema.parse(body));
  }
  @Post('/runs/:id/cancel') cancel(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this.service.cancel(org.id, id);
  }
  @Post('/content') content(
    @GetOrgFromRequest() org: Organization,
    @Body() body: unknown
  ) {
    const p = contentSchema.parse(body);
    return this.store.create(
      org.id,
      'content',
      p.title,
      p,
      p.approved ? 'approved' : 'draft'
    );
  }
  @Put('/content/:id') async edit(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const p = z
      .object({ data: contentSchema, revision: z.number().int().nonnegative() })
      .parse(body);
    const r = await this.store.get(org.id, id);
    if (r.kind !== 'content' || ['exported', 'exporting'].includes(r.status))
      throw new BadRequestException(
        'Edit draft yang sudah diekspor melalui kalender Postiz.'
      );
    return this.store.update(
      org.id,
      id,
      { ...r.data, ...p.data },
      p.data.approved ? 'approved' : 'draft',
      p.revision,
      p.data.title
    );
  }
  @Post('/content/:id/export') export(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const p = z.object({ integrationId: z.string().min(1) }).parse(body);
    return this.service.exportDraft(org.id, id, p.integrationId);
  }
  @Post('/metrics') async metrics(
    @GetOrgFromRequest() org: Organization,
    @Body() body: unknown
  ) {
    const p = z
      .object({ metrics: z.array(metricSchema).min(1).max(100) })
      .parse(body);
    const rows = [];
    for (const m of p.metrics)
      rows.push(await this.store.create(org.id, 'metric', m.title, m));
    return rows;
  }
  @Post('/automations') automation(
    @GetOrgFromRequest() org: Organization,
    @Body() body: unknown
  ) {
    return this.service.automation(org.id, automationSchema.parse(body));
  }
  @Put('/automations/:id') editAutomation(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const p = z
      .object({
        data: automationSchema,
        revision: z.number().int().nonnegative(),
      })
      .parse(body);
    return this.service.automation(org.id, p.data, id, p.revision);
  }
  @Post('/inbox/simulate') simulate(
    @GetOrgFromRequest() org: Organization,
    @Body() body: unknown
  ) {
    const p = z
      .object({ text: z.string().trim().min(1).max(6000) })
      .parse(body);
    return this.service.simulate(org.id, p.text);
  }
  @Post('/inbox/:id/approve') approve(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const p = z
      .object({
        reply: z.string().trim().min(1).max(900),
        revision: z.number().int().nonnegative(),
        confirmed: z.literal(true),
      })
      .parse(body);
    return this.service.approveReply(org.id, id, p.reply, p.revision);
  }
  @Post('/inbox/:id/handoff') handoff(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const p = z.object({ paused: z.boolean() }).parse(body);
    return this.service.handoff(org.id, id, p.paused);
  }
}

// This route is intentionally public for Meta; only a valid app HMAC is accepted.
@Controller('/social-management-webhook/meta')
export class SmmWebhookController {
  constructor(private service: SmmService) {}
  @Get() verify(@Query() q: Record<string, string>, @Res() res: Response) {
    if (
      !process.env.PRADEA_SMM_VERIFY_TOKEN ||
      q['hub.mode'] !== 'subscribe' ||
      q['hub.verify_token'] !== process.env.PRADEA_SMM_VERIFY_TOKEN
    )
      throw new ForbiddenException();
    return res.status(200).type('text/plain').send(q['hub.challenge']);
  }
  @Post() async receive(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-hub-signature-256') signature: string
  ) {
    if (
      !req.rawBody ||
      !verifySignature(
        req.rawBody,
        signature || '',
        process.env.FACEBOOK_APP_SECRET || ''
      )
    )
      throw new ForbiddenException();
    return this.service.receiveMeta(req.body);
  }
}
