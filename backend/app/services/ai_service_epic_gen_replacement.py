    async def _generate_epics_and_stories(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate epics and user stories from Phase 1 content (BRD, Requirements, etc.) using comprehensive EPICS_STORIES_PROMPT
        Supports full generation, incremental changes, and gap analysis modes
        Focuses on Requirements + BRD as primary input, ensures microservice/modular architecture approach
        """
        print(f"🚀 Generating Epics and User Stories using EPICS_STORIES_PROMPT...")
        
        # Extract Phase 1 data
        phase1_data = data.get('phase1_data', {})
        gherkin_requirements = data.get('gherkin_requirements', [])
        requirements = data.get('requirements', [])
        brd = data.get('brd', '')
        prd = data.get('prd', '')
        functional_reqs = data.get('functional_requirements', [])
        nonfunctional_reqs = data.get('nonfunctional_requirements', [])
        stakeholders = data.get('stakeholders', [])
        risks = data.get('risks', [])
        api_spec = data.get('api_spec', {})
        
        # Existing epics and user stories (for incremental/gap-analysis generation)
        existing_epics = data.get('existing_epics', [])
        existing_stories = data.get('existing_user_stories', [])
        
        # Generation mode flags
        is_incremental = data.get('is_incremental', False)
        manual_changes_mode = data.get('manual_changes_mode', False)
        changes_only = data.get('changes_only', False)
        changes_summary_from_frontend = data.get('changes_summary', '')
        changed_content = data.get('changed_content', {})
        
        # Project info
        project_info = {
            'name': data.get('project_name', 'Software Project'),
            'description': data.get('project_description', '')
        }
        
        print(f"📊 Generation Mode:")
        print(f"  - Is Incremental: {is_incremental}")
        print(f"  - Manual Changes Mode: {manual_changes_mode}")
        print(f"  - Changes Only: {changes_only}")
        print(f"  - Existing Epics: {len(existing_epics)}")
        print(f"  - Existing Stories: {len(existing_stories)}")
        
        # Build comprehensive context from Requirements + BRD
        context_parts = []
        
        # 1. BRD Context (primary input)
        if brd:
            context_parts.append(f"**BUSINESS REQUIREMENTS DOCUMENT (BRD)**:\n{brd}\n")
        
        # 2. Requirements Context (primary input)
        requirements_text = ""
        if gherkin_requirements:
            requirements_text += f"\n**GHERKIN SCENARIOS** ({len(gherkin_requirements)} scenarios):\n"
            for idx, scenario in enumerate(gherkin_requirements[:25], 1):
                requirements_text += f"\nScenario {idx}: {scenario.get('scenario_title', 'Untitled')}\n"
                if scenario.get('background'):
                    requirements_text += f"Background: {scenario['background']}\n"
                for step in scenario.get('given_when_then', []):
                    requirements_text += f"  {step}\n"
            if len(gherkin_requirements) > 25:
                requirements_text += f"\n... and {len(gherkin_requirements) - 25} more scenarios"
        
        if requirements:
            requirements_text += f"\n**REQUIREMENTS** ({len(requirements)} items):\n"
            for idx, req in enumerate(requirements[:30], 1):
                if isinstance(req, dict):
                    req_text = req.get('requirement') or req.get('title') or str(req)
                else:
                    req_text = str(req)
                requirements_text += f"{idx}. {req_text}\n"
            if len(requirements) > 30:
                requirements_text += f"\n... and {len(requirements) - 30} more requirements"
        
        if requirements_text:
            context_parts.append(f"**REQUIREMENTS** (FROM PHASE 1):\n{requirements_text}\n")
        
        # 3. Functional/Non-Functional Requirements
        if functional_reqs or nonfunctional_reqs:
            fn_text = "\n**FUNCTIONAL REQUIREMENTS**:\n"
            for idx, req in enumerate(functional_reqs[:20], 1):
                if isinstance(req, dict):
                    req_text = req.get('requirement') or req.get('title') or str(req)
                else:
                    req_text = str(req)
                fn_text += f"  {idx}. {req_text}\n"
            if len(functional_reqs) > 20:
                fn_text += f"  ... and {len(functional_reqs) - 20} more\n"
            
            fn_text += "\n**NON-FUNCTIONAL REQUIREMENTS**:\n"
            for idx, req in enumerate(nonfunctional_reqs[:15], 1):
                if isinstance(req, dict):
                    req_text = req.get('requirement') or req.get('title') or str(req)
                else:
                    req_text = str(req)
                fn_text += f"  {idx}. {req_text}\n"
            if len(nonfunctional_reqs) > 15:
                fn_text += f"  ... and {len(nonfunctional_reqs) - 15} more\n"
            
            context_parts.append(fn_text)
        
        # 4. Risk Context
        if risks:
            risks_text = "\n**IDENTIFIED RISKS**:\n"
            for idx, risk in enumerate(risks[:10], 1):
                risks_text += f"  {idx}. {risk.get('description', 'Risk')} (Severity: {risk.get('severity', 'Medium')})\n"
            if len(risks) > 10:
                risks_text += f"  ... and {len(risks) - 10} more risks\n"
            context_parts.append(risks_text)
        
        # 5. API Context (if available)
        if api_spec:
            api_text = f"\n**API SPECIFICATION**:\n"
            api_text += f"- Title: {api_spec.get('info', {}).get('title', 'API')}\n"
            api_text += f"- Endpoints: {len(api_spec.get('paths', {}))}\n"
            
            api_endpoints = api_spec.get('paths', {})
            resource_groups = {}
            for path, methods in api_endpoints.items():
                resource = path.split('/')[1] if '/' in path else 'general'
                if resource not in resource_groups:
                    resource_groups[resource] = []
                for method, spec in methods.items():
                    summary = spec.get('summary', spec.get('description', 'Endpoint'))
                    resource_groups[resource].append(f"{method.upper()} {path}: {summary}")
            
            for resource, endpoints in resource_groups.items():
                api_text += f"\n{resource.capitalize()} Resource:\n"
                for endpoint in endpoints[:5]:
                    api_text += f"  • {endpoint}\n"
                if len(endpoints) > 5:
                    api_text += f"  • ... and {len(endpoints) - 5} more\n"
            
            context_parts.append(api_text)
        
        # Prepare generation context
        full_context = "\n".join(context_parts)
        
        # Build generation mode instructions
        generation_instructions = ""
        
        if is_incremental and existing_epics:
            # Incremental mode: Show existing epics, ask for new ones only
            generation_instructions = f"""
🔄 **INCREMENTAL GENERATION MODE**

**EXISTING EPICS** (DO NOT REGENERATE OR MODIFY):
{len(existing_epics)} existing epics already approved:
"""
            for idx, epic in enumerate(existing_epics[:10], 1):
                generation_instructions += f"\n  {idx}. **{epic.get('title')}** (ID: {epic.get('id')})"
                generation_instructions += f"\n     - {epic.get('description', '')[:100]}{'...' if len(epic.get('description', '')) > 100 else ''}"
            
            if len(existing_epics) > 10:
                generation_instructions += f"\n  ... and {len(existing_epics) - 10} more existing epics\n"
            
            generation_instructions += f"""

**CRITICAL RULES**:
- ❌ DO NOT return any of the {len(existing_epics)} existing epics above
- ❌ DO NOT modify or recreate existing user stories
- ✅ ONLY create NEW epics for UNCOVERED functionality
- ✅ Ensure new epic IDs start from {len(existing_epics) + 1}
- ✅ If no new functionality found, return empty: {{"epics": [], "user_stories": []}}

**NEW CHANGES DETECTED**:
{changes_summary_from_frontend}

Generate ONLY NEW epics for the changes above, not covered by the {len(existing_epics)} existing epics.
"""
        
        elif manual_changes_mode and existing_epics:
            # Gap analysis mode: Compare Phase 1 with existing epics
            generation_instructions = f"""
🔍 **GAP ANALYSIS MODE**

**EXISTING EPICS** ({len(existing_epics)} total, shown for reference):
"""
            for idx, epic in enumerate(existing_epics[:15], 1):
                generation_instructions += f"\n  {idx}. **{epic.get('title')}** - {epic.get('description', '')[:80]}{'...' if len(epic.get('description', '')) > 80 else ''}"
            
            if len(existing_epics) > 15:
                generation_instructions += f"\n  ... and {len(existing_epics) - 15} more"
            
            generation_instructions += f"""

**YOUR TASK**:
1. Read ALL Phase 1 content (BRD + Requirements) above completely
2. For EACH requirement, check if covered by ANY of the {len(existing_epics)} existing epics
3. Identify TRULY NEW requirements not covered by any epic
4. Create ONLY NEW epics for uncovered functionality (IDs from {len(existing_epics) + 1})
5. If EVERYTHING is covered, return empty arrays

**CRITICAL RULES**:
- ❌ NEVER return existing epics (IDs 1-{len(existing_epics)})
- ❌ NEVER recreate or modify existing stories
- ❌ NEVER create overlapping functionality
- ✅ When in doubt about overlap, create the epic (better to split than miss)
"""
        
        else:
            # Full generation mode: Create all epics from scratch
            generation_instructions = """
📋 **FULL GENERATION MODE**

Create a comprehensive set of epics that fully decompose ALL requirements.

**ARCHITECTURE APPROACH**:
- Minimum 3 major EPICs using microservice/modular architecture
- Each EPIC represents a distinct business capability or module
- EPICs should be independent but can have dependencies marked

**EPIC REQUIREMENTS**:
- Title: Clear, descriptive (e.g., "User Authentication System", "Payment Processing Module")
- Description: Explain the business capability and why it's a separate module
- Why Separate: Brief justification for keeping as independent epic (microservice boundary)
- Dependencies: List other epics this depends on (if any)
- Blockers: Any known blockers or prerequisites
- Stories: 4-8 detailed user stories per epic

**USER STORY REQUIREMENTS**:
- Format: "As a [role], I want [goal], so that [benefit]"
- Acceptance Criteria: Specific, testable, measurable
- FR Mapping: Link to functional requirements from Phase 1
- NFR Mapping: Link to non-functional requirements (performance, security, etc.)
- Dependencies: Other stories this depends on
- Blockers: Any known blockers
- Points: 3, 5, 8, or 13 (Fibonacci scale)

**CRITICAL**: Do NOT invent features not in Phase 1 content. Only decompose what's explicitly stated.
"""
        
        # Build the comprehensive prompt
        prompt = f"""You are an expert Product Manager and Agile Scrum Master specializing in hierarchical epic and user story decomposition.

**PROJECT**: {project_info.get('name', 'Software Project')}

**PHASE 1 CONTENT - YOUR PRIMARY INPUT** (Requirements + BRD):

{full_context}

---

{generation_instructions}

---

**OUTPUT FORMAT** (Valid JSON only, no additional text):

{{
  "epics": [
    {{
      "id": 1,
      "title": "Epic Title",
      "description": "What this epic delivers",
      "why_separate": "Why this is a separate module/microservice",
      "dependencies": ["Epic ID references for dependencies"],
      "blockers": ["Known blockers or prerequisites"],
      "stories": 6,
      "points": 30,
      "priority": "High",
      "requirements_mapped": ["requirement keywords or IDs from Phase 1"]
    }}
  ],
  "user_stories": [
    {{
      "id": 1,
      "epic": "Epic Title",
      "epic_id": 1,
      "title": "As a [role], I want [goal], so that [benefit]",
      "description": "Detailed description of what needs to be implemented",
      "acceptance_criteria": [
        "Specific, testable criterion 1",
        "Specific, testable criterion 2",
        "Specific, testable criterion 3"
      ],
      "fr_mapping": ["Functional requirement from Phase 1 this implements"],
      "nfr_mapping": ["Non-functional requirement this addresses"],
      "dependencies": ["Story IDs or descriptions this depends on"],
      "blockers": ["Known blockers"],
      "points": 5,
      "priority": "High",
      "sprint": null,
      "status": "backlog"
    }}
  ]
}}

**CRITICAL REQUIREMENTS**:
1. Return ONLY valid JSON, no markdown or explanation
2. Ensure all epic IDs are unique and sequential
3. Ensure all story IDs are unique and sequential
4. Every story must have an epic_id pointing to a valid epic in the response
5. In incremental mode: ONLY include NEW epics (IDs {len(existing_epics) + 1} and higher)
6. In incremental mode: If NO new epics needed, return {{"epics": [], "user_stories": []}}
7. Use microservice/modular thinking: separate concerns, clear boundaries, independent deployment
8. Minimum 3 epics for full generation mode
9. NO invented features: only decompose Phase 1 content
10. Every story must map to at least one requirement from Phase 1 content
"""
        
        try:
            print(f"📤 Calling OpenAI API with comprehensive prompt (temperature=0.3 for consistency)...")
            
            # Call OpenAI API with temperature 0.3 for consistent output
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system", 
                        "content": "You are an expert Product Manager and Agile Scrum Master who creates comprehensive, hierarchical epics and user stories from requirements. You deeply understand microservice architecture and decomposition. You ALWAYS respond with ONLY valid JSON, no explanations or markdown."
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                temperature=0.3,  # Consistent, deterministic output
                max_tokens=6000
            )
            
            # Parse the response
            content = response.choices[0].message.content.strip()
            print(f"📥 Received response from OpenAI ({len(content)} chars)")
            
            # Remove markdown code blocks if present
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
                content = content.strip()
            
            result = json.loads(content)
            
            # Validate structure
            if 'epics' not in result or 'user_stories' not in result:
                raise ValueError("Missing epics or user_stories in response")
            
            epics = result.get('epics', [])
            user_stories = result.get('user_stories', [])
            
            print(f"✅ Generated {len(epics)} epics and {len(user_stories)} user stories")
            
            # Normalize IDs in incremental mode
            if is_incremental and existing_epics:
                try:
                    max_existing_epic_id = max([e.get('id', 0) for e in existing_epics] or [0])
                    max_existing_story_id = max([s.get('id', 0) for s in existing_stories] or [0])
                except (ValueError, TypeError):
                    max_existing_epic_id = len(existing_epics)
                    max_existing_story_id = len(existing_stories)
                
                # Remap epic IDs if needed
                epic_id_map = {}
                for epic in epics:
                    old_id = epic.get('id', 1)
                    if old_id <= max_existing_epic_id:
                        new_id = max_existing_epic_id + 1
                        epic_id_map[old_id] = new_id
                        epic['id'] = new_id
                        max_existing_epic_id = new_id
                    else:
                        epic_id_map[old_id] = old_id
                
                # Remap story IDs and epic_id references
                for story in user_stories:
                    if story.get('id', 1) <= max_existing_story_id:
                        max_existing_story_id += 1
                        story['id'] = max_existing_story_id
                    
                    # Remap epic_id reference
                    if 'epic_id' in story and story['epic_id'] in epic_id_map:
                        story['epic_id'] = epic_id_map[story['epic_id']]
            
            # Ensure all stories have required fields
            for epic in epics:
                if 'id' not in epic:
                    epic['id'] = len(epics)
                if 'title' not in epic:
                    epic['title'] = f"Epic {epic['id']}"
                if 'description' not in epic:
                    epic['description'] = ""
                if 'why_separate' not in epic:
                    epic['why_separate'] = ""
                if 'dependencies' not in epic:
                    epic['dependencies'] = []
                if 'blockers' not in epic:
                    epic['blockers'] = []
                if 'points' not in epic:
                    epic['points'] = 0
                if 'priority' not in epic:
                    epic['priority'] = "Medium"
                if 'requirements_mapped' not in epic:
                    epic['requirements_mapped'] = []
            
            # Ensure all stories have required fields
            for story in user_stories:
                if 'id' not in story:
                    story['id'] = len(user_stories)
                if 'epic_id' not in story and epics:
                    story['epic_id'] = epics[0]['id']
                if 'epic' not in story and epics:
                    story['epic'] = epics[0].get('title', 'Unknown')
                if 'title' not in story:
                    story['title'] = f"Story {story['id']}"
                if 'description' not in story:
                    story['description'] = ""
                if 'acceptance_criteria' not in story:
                    story['acceptance_criteria'] = []
                if 'fr_mapping' not in story:
                    story['fr_mapping'] = []
                if 'nfr_mapping' not in story:
                    story['nfr_mapping'] = []
                if 'dependencies' not in story:
                    story['dependencies'] = []
                if 'blockers' not in story:
                    story['blockers'] = []
                if 'points' not in story:
                    story['points'] = 5
                if 'priority' not in story:
                    story['priority'] = "Medium"
                if 'sprint' not in story:
                    story['sprint'] = None
                if 'status' not in story:
                    story['status'] = "backlog"
            
            print(f"✅ Validation complete. Returning {len(epics)} epics and {len(user_stories)} user stories")
            
            return {
                'epics': epics,
                'user_stories': user_stories
            }
            
        except json.JSONDecodeError as e:
            print(f"❌ JSON Parse Error: {str(e)}")
            print(f"Content: {content[:200] if len(content) > 200 else content}")
            raise
        except Exception as e:
            print(f"❌ Error generating epics and stories: {str(e)}")
            print(f"Falling back to empty generation")
            
            # Return empty for error cases
            return {
                'epics': [],
                'user_stories': []
            }
