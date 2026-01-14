CREATE INDEX "collection_audit_results_coll_id_idx" ON "collection_audit_results" USING btree ("coll_id");--> statement-breakpoint
CREATE INDEX "collection_audit_results_date_folder_idx" ON "collection_audit_results" USING btree ("date_folder");--> statement-breakpoint
CREATE INDEX "collection_audit_results_score_idx" ON "collection_audit_results" USING btree ("score");--> statement-breakpoint
CREATE INDEX "collection_audit_results_processed_at_idx" ON "collection_audit_results" USING btree ("processed_at");--> statement-breakpoint
CREATE INDEX "collection_audit_results_coll_id_date_idx" ON "collection_audit_results" USING btree ("coll_id","date_folder");