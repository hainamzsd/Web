#!/bin/bash

# Auto-Improve Loop Script
# Continuously enhances the C06 Platform with Claude's help

set -e

PROJECT_DIR="D:/laptrinh/DFL2025/Web"
LOG_FILE="$PROJECT_DIR/auto-improve.log"
ITERATION=0
MAX_ITERATIONS=10

echo "🚀 Starting Auto-Improve Loop for C06 Platform" | tee -a "$LOG_FILE"
echo "Project Directory: $PROJECT_DIR" | tee -a "$LOG_FILE"
echo "Max Iterations: $MAX_ITERATIONS" | tee -a "$LOG_FILE"
echo "=====================================" | tee -a "$LOG_FILE"

cd "$PROJECT_DIR"

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
  ITERATION=$((ITERATION + 1))
  echo "" | tee -a "$LOG_FILE"
  echo "📍 ITERATION $ITERATION of $MAX_ITERATIONS" | tee -a "$LOG_FILE"
  echo "Time: $(date)" | tee -a "$LOG_FILE"
  echo "-------------------------------------" | tee -a "$LOG_FILE"

  # Check if NEXT_TASKS.md exists
  if [ ! -f "NEXT_TASKS.md" ]; then
    echo "⚠️  NEXT_TASKS.md not found! Creating initial tasks..." | tee -a "$LOG_FILE"
    cat > NEXT_TASKS.md << 'EOF'
# Next Development Tasks

## Current Iteration: 1
## Priority: HIGH

### 1. Performance Optimization
- Implement code splitting for large components
- Add lazy loading for map tiles
- Optimize database queries with indexes
- Add caching layer with Redis

### 2. Testing Infrastructure
- Set up Jest and React Testing Library
- Write unit tests for utilities
- Add integration tests for workflows
- Implement E2E tests with Playwright

### 3. Security Enhancements
- Add rate limiting to API endpoints
- Implement CSRF protection
- Add input sanitization
- Set up security headers

### 4. Documentation
- Generate API documentation
- Create user manual
- Add inline code documentation
- Create video tutorials

### 5. UI/UX Improvements
- Add loading skeletons
- Implement toast notifications
- Add confirmation dialogs
- Improve mobile responsiveness

### 6. Advanced Features
- Implement offline mode with PWA
- Add bulk import/export
- Create dashboard widgets
- Add custom report builder

### 7. Monitoring & Logging
- Set up error tracking (Sentry)
- Add performance monitoring
- Implement audit logging
- Create admin dashboard

### 8. Deployment
- Set up CI/CD pipeline
- Configure production environment
- Add database backups
- Set up monitoring alerts

---
**Status:** Ready for implementation
**Last Updated:** $(date)
EOF
    echo "✅ Created NEXT_TASKS.md with initial tasks" | tee -a "$LOG_FILE"
  fi

  echo "📋 Reading current tasks from NEXT_TASKS.md..." | tee -a "$LOG_FILE"

  # Show current tasks
  echo "Current tasks to implement:" | tee -a "$LOG_FILE"
  head -n 30 NEXT_TASKS.md | tee -a "$LOG_FILE"

  echo "" | tee -a "$LOG_FILE"
  echo "🤖 Task for Claude:" | tee -a "$LOG_FILE"
  echo "===================================" | tee -a "$LOG_FILE"
  cat << 'CLAUDE_PROMPT'
Please read NEXT_TASKS.md and implement the highest priority task.

Instructions:
1. Read NEXT_TASKS.md to see what needs to be done
2. Choose the FIRST uncompleted task
3. Implement it fully with all necessary code
4. Test that everything builds successfully (npm run build)
5. Update NEXT_TASKS.md by:
   - Marking the completed task as [DONE]
   - Moving to the next task
   - Adding new tasks if you discover them
   - Updating the iteration number
6. Write a brief summary of what you implemented

Focus on:
- Production-ready code
- Type safety
- Error handling
- Testing (if applicable)
- Documentation

Build must succeed before marking task complete!
CLAUDE_PROMPT

  echo "===================================" | tee -a "$LOG_FILE"
  echo "" | tee -a "$LOG_FILE"
  echo "⏸️  PAUSED: Waiting for Claude to implement..." | tee -a "$LOG_FILE"
  echo "" | tee -a "$LOG_FILE"
  echo "📝 After Claude completes the task:" | tee -a "$LOG_FILE"
  echo "   1. Review the changes" | tee -a "$LOG_FILE"
  echo "   2. Test the build: npm run build" | tee -a "$LOG_FILE"
  echo "   3. Press ENTER to continue to next iteration" | tee -a "$LOG_FILE"
  echo "   4. Or type 'stop' to end the loop" | tee -a "$LOG_FILE"
  echo "" | tee -a "$LOG_FILE"

  # Wait for user input
  read -p "Press ENTER to continue or type 'stop': " user_input

  if [ "$user_input" == "stop" ]; then
    echo "🛑 Stopping auto-improve loop at iteration $ITERATION" | tee -a "$LOG_FILE"
    break
  fi

  # Verify build succeeds
  echo "🔨 Verifying build..." | tee -a "$LOG_FILE"
  if npm run build -- --no-lint > /dev/null 2>&1; then
    echo "✅ Build successful!" | tee -a "$LOG_FILE"
  else
    echo "❌ Build failed! Please fix errors before continuing." | tee -a "$LOG_FILE"
    echo "Run: npm run build" | tee -a "$LOG_FILE"
    echo "Pausing loop..." | tee -a "$LOG_FILE"
    read -p "Press ENTER after fixing build..."
  fi

  # Git commit (optional)
  if [ -d ".git" ]; then
    echo "📦 Git commit..." | tee -a "$LOG_FILE"
    git add -A
    git commit -m "Auto-improve: Iteration $ITERATION - $(date +%Y%m%d-%H%M%S)" || echo "No changes to commit"
  fi

  echo "✅ Iteration $ITERATION complete!" | tee -a "$LOG_FILE"

done

echo "" | tee -a "$LOG_FILE"
echo "🎉 Auto-Improve Loop Complete!" | tee -a "$LOG_FILE"
echo "Total Iterations: $ITERATION" | tee -a "$LOG_FILE"
echo "Log file: $LOG_FILE" | tee -a "$LOG_FILE"
echo "=====================================" | tee -a "$LOG_FILE"
