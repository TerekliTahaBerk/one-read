#!/usr/bin/env node

import { runProductionDatabaseGuard } from "./release/database-guard.mjs";

process.exit(runProductionDatabaseGuard());
