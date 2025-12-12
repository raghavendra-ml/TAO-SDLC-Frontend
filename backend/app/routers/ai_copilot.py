from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body
from sqlalchemy.orm import Session
from sqlalchemy import inspect
from sqlalchemy.orm.attributes import flag_modified
from typing import List
from datetime import datetime
from app import models, schemas
from app.database import get_db
from app.services.ai_service import AIService
from app.services.document_parser import DocumentParser
from app.services.api_spec_parser import APISpecParser
import tempfile
import os
import yaml
import json

router = APIRouter()
ai_service = AIService()
doc_parser = DocumentParser()
api_spec_parser = APISpecParser()

@router.post("/query", response_model=schemas.AIResponse)
async def ai_query(query: schemas.AIQuery, db: Session = Depends(get_db)):
    """
    Process AI query for a specific project phase
    """
    try:
        # Get phase context
        phase = db.query(models.Phase).filter(models.Phase.id == query.phase_id).first()
        if not phase:
            raise HTTPException(status_code=404, detail="Phase not found")
        
        # Process with AI service
        response = await ai_service.process_query(
            query.query,
            phase.phase_name,
            query.context
        )
        
        # Store interaction
        interaction = models.AIInteraction(
            project_id=query.project_id,
            phase_id=query.phase_id,
            user_query=query.query,
            ai_response=response["response"],
            confidence_score=response["confidence_score"]
        )
        db.add(interaction)
        db.commit()
        
        return schemas.AIResponse(
            response=response["response"],
            confidence_score=response["confidence_score"],
            alternatives=response.get("alternatives", []),
            explanation=response.get("explanation")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate/{phase_id}")
async def generate_content(
    phase_id: int,
    request_data: dict = Body(...),
    db: Session = Depends(get_db)
):
    """
    Generate phase-specific content (PRD, FSD, Architecture, etc.)
    """
    phase = db.query(models.Phase).filter(models.Phase.id == phase_id).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    
    content_type = request_data.get("content_type")
    if not content_type:
        raise HTTPException(status_code=400, detail="content_type is required")
    
    # Use the data from request (fresh requirements) instead of cached phase data
    generation_data = {
        "requirements": request_data.get("requirements", []),
        "gherkinRequirements": request_data.get("gherkinRequirements", []),
        "functionalRequirements": request_data.get("functionalRequirements", []),
        "nonFunctionalRequirements": request_data.get("nonFunctionalRequirements", []),
        "businessProposal": request_data.get("businessProposal", {}),
        "extractedStakeholders": request_data.get("extractedStakeholders", []),
        "extractedRisks": request_data.get("extractedRisks", {}),
        "aiNotes": request_data.get("aiNotes", ""),
        "prd": request_data.get("prd"),
        "brd": request_data.get("brd"),
        "epics": request_data.get("epics", []),
        "userStories": request_data.get("userStories", []),
        "executionOrder": request_data.get("executionOrder", []),
        "project": request_data.get("project"),
        "apiSpec": request_data.get("apiSpec"),
        "apiSummary": request_data.get("apiSummary", ""),
        "risks": request_data.get("risks", []),
        # Incremental generation support
        "isIncrementalGeneration": request_data.get("isIncrementalGeneration", False),
        "existingEpics": request_data.get("existingEpics", []),
        "existingStories": request_data.get("existingStories", []),
        "changesOnly": request_data.get("changesOnly", False),
        "manualChangesMode": request_data.get("manualChangesMode", False),
        "changesSummary": request_data.get("changesSummary", ""),
        "lastGeneratedFromPhase1Version": request_data.get("lastGeneratedFromPhase1Version", {}),
        "phase1VersionHistory": request_data.get("phase1VersionHistory", {}),
        "changedContent": request_data.get("changedContent", {}),
        # LLD-specific context
        "user_stories": request_data.get("user_stories", []),
        "business_requirements": request_data.get("business_requirements", {}),
        "product_requirements": request_data.get("product_requirements", {}),
        "architecture": request_data.get("architecture", {}),
        "generation_goals": request_data.get("generation_goals", []),
        # Pass-through keys required by component-wise LLD generator
        "system_components": request_data.get("system_components", []),
        "hld": request_data.get("hld"),
        # User story specific pass-through for Phase 5
        "user_story": request_data.get("user_story"),
        "epic": request_data.get("epic"),
        "technical_context": request_data.get("technical_context", {}),
        "business_context": request_data.get("business_context", {}),
        "lld": request_data.get("lld", {}),
        # Dev generation preferences (Phase 5)
        "preferences": request_data.get("preferences", {}),
        "tech_stack": request_data.get("tech_stack", {}),
        "selected_components": request_data.get("selected_components", []),
    }
    
    print(f"🔥 [BACKEND] Generate content request for {content_type}:")
    print(f"   - Incremental: {generation_data.get('isIncrementalGeneration')}")
    print(f"   - Manual Changes Mode: {generation_data.get('manualChangesMode')}")
    print(f"   - Existing Epics: {len(generation_data.get('existingEpics', []))}")
    print(f"   - Has Summary: {bool(generation_data.get('changesSummary'))}")
    # Extra diagnostics for component-wise LLD generation issues
    if content_type == "component_wise_lld":
        comps = generation_data.get("system_components", [])
        stories = generation_data.get("user_stories", [])
        epics_list = generation_data.get("epics", [])
        hld_text = generation_data.get("hld") or ""
        print("   [DIAG] Component-Wise LLD Input Snapshot:")
        print(f"     • Epics count: {len(epics_list)}")
        print(f"     • User stories count: {len(stories)}")
        print(f"     • System components count: {len(comps)}")
        print(f"     • System components TYPE: {type(comps)}")
        print(f"     • System components FULL: {comps}")
        sample_names = [c.get('name') or c.get('type') if isinstance(c, dict) else str(c) for c in comps[:3]]
        print(f"     • Component sample: {sample_names}")
        print(f"     • HLD length: {len(hld_text)} chars")
        # Detect empty scenario early
        if not comps:
            print("   [WARN] ❌ No system_components received in request body for component_wise_lld")
        if comps and all(not c.get('name') for c in comps if isinstance(c, dict)):
            print("   [WARN] Components received but missing 'name' keys; fallback names will be used")
   
    try:
        result = await ai_service.generate_content(phase.phase_name, content_type, generation_data)
        
        print(f"\n[GENERATE_ENDPOINT] ✅ Generation succeeded!")
        print(f"[GENERATE_ENDPOINT] Result keys: {list(result.keys()) if isinstance(result, dict) else 'N/A'}")
        
        # 🔴 CRITICAL: Save generated content to database - THIS MUST SUCCEED
        print(f"\n🔴🔴🔴 [SAVE_TO_DB] ========== CRITICAL PERSISTENCE OPERATION ==========")
        print(f"💾 [SAVE_TO_DB] Saving {content_type} to phase ID {phase.id}")
        
        # Step 1: Get current phase data
        print(f"📝 [SAVE_TO_DB] Step 1: Reading current phase.data...")
        phase_data = phase.data or {}
        print(f"   Type: {type(phase_data)}, Value: {str(phase_data)[:100]}...")
        
        # Step 2: Handle if it's a JSON string
        if isinstance(phase_data, str):
            print(f"📝 [SAVE_TO_DB] Step 2a: phase.data is STRING, parsing as JSON...")
            try:
                phase_data = json.loads(phase_data)
                print(f"   ✅ Parsed successfully, now keys: {list(phase_data.keys())}")
            except Exception as parse_err:
                print(f"   ❌ Parse failed: {parse_err}, using empty dict")
                phase_data = {}
        else:
            print(f"📝 [SAVE_TO_DB] Step 2b: phase.data is already {type(phase_data).__name__}, no parsing needed")
        
        # Step 3: Ensure we have a mutable dict
        if not isinstance(phase_data, dict):
            print(f"⚠️  [SAVE_TO_DB] Step 3: phase_data is not dict! Type: {type(phase_data)}, converting to empty dict")
            phase_data = {}
        else:
            print(f"✅ [SAVE_TO_DB] Step 3: phase_data is dict, good to go")
        
        # Step 4: Add the generated content
        print(f"📝 [SAVE_TO_DB] Step 4: Adding {content_type} to phase_data...")
        print(f"   Before: keys = {list(phase_data.keys())}")
        phase_data[content_type] = result
        print(f"   After: keys = {list(phase_data.keys())}")
        
        # Step 5: Assign back to phase
        print(f"📝 [SAVE_TO_DB] Step 5: Assigning updated dict back to phase.data...")
        phase.data = phase_data
        print(f"   phase.data type after assignment: {type(phase.data)}")
        
        # Step 6: Mark the field as modified for SQLAlchemy JSON tracking
        print(f"📝 [SAVE_TO_DB] Step 6: Marking 'data' field as modified for SQLAlchemy...")
        flag_modified(phase, "data")
        print(f"   ✅ flag_modified called successfully")
        
        # Step 7: Commit to database - NO TRY/CATCH, LET IT FAIL IF IT FAILS
        print(f"💾 [SAVE_TO_DB] Step 7: Committing to database...")
        db.commit()
        print(f"   ✅ Commit successful")
        
        # Step 8: Refresh from database to verify
        print(f"📝 [SAVE_TO_DB] Step 8: Refreshing phase from database...")
        db.refresh(phase)
        print(f"   ✅ Refresh successful")
        
        # Step 9: Verify what was saved
        print(f"📝 [SAVE_TO_DB] Step 9: Verifying saved data...")
        saved_data = phase.data or {}
        print(f"   Data type: {type(saved_data)}, Keys: {list(saved_data.keys()) if isinstance(saved_data, dict) else 'N/A'}")
        
        if content_type in saved_data:
            saved_content = saved_data[content_type]
            if isinstance(saved_content, dict):
                saved_size = len(json.dumps(saved_content))
                inner_keys = list(saved_content.keys())
                print(f"   ✅ {content_type} saved! Size: {saved_size} bytes, Keys: {inner_keys}")
            else:
                saved_size = len(str(saved_content))
                print(f"   ✅ {content_type} saved! Size: {saved_size} bytes (string)")
        else:
            print(f"   ❌ ERROR: {content_type} NOT in saved data!")
            print(f"   Available keys: {list(saved_data.keys())}")
            raise Exception(f"Failed to persist {content_type} to database - data not found after commit!")
        
        print(f"🟢 [SAVE_TO_DB] ========== PERSISTENCE OPERATION COMPLETE ==========\n")
        
        # 🔵 PHASE 5 SPECIFIC: Save to Phase5Deliverable table for persistence
        if content_type == "user_story_dev_delivery" and phase.phase_number == 5:
            try:
                print(f"[PHASE5_DB] 💾 Saving Phase 5 deliverable to database...")
                project_id = phase.project_id
                
                # Prepare metadata for database storage
                deliverable_data = {
                    "code": result.get("code", []),
                    "tests": result.get("tests", []),
                    "api": result.get("api", {}),
                    "readme": result.get("readme", ""),
                    "metadata": {
                        "story_id": result.get("metadata", {}).get("story_id"),
                        "story_title": result.get("metadata", {}).get("story_title"),
                        "components_used": result.get("metadata", {}).get("components", []),
                        "epic_id": generation_data.get("epic", {}).get("id", ""),
                        "language": result.get("metadata", {}).get("language"),
                        "test_framework": result.get("metadata", {}).get("test_framework")
                    }
                }
                
                # Save using ai_service method
                saved = ai_service.save_deliverable_to_db(db, project_id, deliverable_data)
                
                if saved:
                    print(f"[PHASE5_DB] ✅ Phase 5 deliverable persisted successfully")
                else:
                    print(f"[PHASE5_DB] ⚠️ Failed to persist Phase 5 deliverable, but generation succeeded")
                    
            except Exception as phase5_err:
                print(f"[PHASE5_DB] ⚠️ Error saving Phase 5 deliverable: {str(phase5_err)}")
                # Don't fail the request - persistence error shouldn't block generation
        
        print(f"[GENERATE_ENDPOINT] ✅ ========== RETURNING RESULT TO FRONTEND ==========")
        print(f"[GENERATE_ENDPOINT] Result type: {type(result)}")
        print(f"[GENERATE_ENDPOINT] Result keys: {list(result.keys())}")
        if isinstance(result, dict):
            for key in ['code', 'tests', 'api', 'readme', 'metadata']:
                if key in result:
                    if isinstance(result[key], list):
                        print(f"[GENERATE_ENDPOINT]   {key}: Array with {len(result[key])} items")
                    elif isinstance(result[key], dict):
                        print(f"[GENERATE_ENDPOINT]   {key}: Dict with keys {list(result[key].keys())}")
                    else:
                        print(f"[GENERATE_ENDPOINT]   {key}: {type(result[key])}")
        
        return result
    except Exception as e:
        print(f"❌ Error in generate_content endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        try:
            db.rollback()
        except:
            pass
        raise HTTPException(status_code=500, detail=f"Error generating {content_type}: {str(e)}")

@router.post("/extract-requirements")
async def extract_requirements(
    files: List[UploadFile] = File(...),
    project_id: int = Form(...),
    phase_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """
    Extract requirements from uploaded documents and convert to Gherkin format using OpenAI.
    
    Returns:
        - requirements: List of Gherkin format requirements
        - count: Number of requirements extracted
    """
    try:
        # Get project info
        project = db.query(models.Project).filter(models.Project.id == project_id).first()
        project_name = project.name if project else "Project"
        
        extracted_all_requirements = []
        all_business_proposals = {}
        all_risks_categorized = {}
        all_stakeholders_extracted = []
        all_ai_notes = []

        print(f"[INFO] Extracting requirements from {len(files)} file(s) for project: {project_name}")
        
        for file in files:
            print(f"[INFO] Processing file: {file.filename}")
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
                content = await file.read()
                tmp.write(content)
                tmp_path = tmp.name
            
            try:
                print(f"[INFO] Parsing document: {file.filename}")
                parsed_content = doc_parser.parse_document(tmp_path, file.filename)
                parsed_content['is_manual'] = False
                print(f"[INFO] Extracting structured requirements with OpenAI from: {file.filename}")
                
                extracted_data, _ = await ai_service.extract_structured_requirements_real(parsed_content)
                
                extracted_requirements = extracted_data.get("requirements", [])
                business_proposal = extracted_data.get("business_proposal", {})
                risks_categorized = extracted_data.get("risks_categorized", {})
                stakeholders_extracted = extracted_data.get("stakeholders", [])
                ai_notes = extracted_data.get("ai_notes", '')
                
                extracted_all_requirements.extend(extracted_requirements)
                all_business_proposals.update(business_proposal) # Merge business proposals
                all_risks_categorized.update(risks_categorized) # Merge risks
                all_stakeholders_extracted.extend(stakeholders_extracted) # Accumulate stakeholders
                all_ai_notes.append(ai_notes) # Accumulate AI notes

                print(f"[OK] Extracted {len(extracted_requirements)} requirements from {file.filename}")
            finally:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
        
        if not extracted_all_requirements:
            return {
                "status": "warning",
                "requirements": [],
                "count": 0,
                "message": "No requirements could be extracted from the uploaded documents. Please check the document format and content."
            }
        
        # Update phase data with all extracted sections
        phase = db.query(models.Phase).filter(models.Phase.id == phase_id).first()
        if not phase:
            raise HTTPException(status_code=404, detail="Phase not found during final save")
        
        phase_data = phase.data or {}
        phase_data['gherkinRequirements'] = extracted_all_requirements
        phase_data['businessProposal'] = all_business_proposals
        phase_data['risksCategorized'] = all_risks_categorized
        phase_data['stakeholdersExtracted'] = all_stakeholders_extracted
        phase_data['aiNotes'] = all_ai_notes
        phase.data = phase_data
        db.commit()

        print(f"[SUCCESS] Extraction complete: {len(extracted_all_requirements)} requirements, {len(all_stakeholders_extracted)} stakeholders, {len(all_risks_categorized)} categorized risks extracted")
        
        return {
            "status": "success",
            "requirements": extracted_all_requirements,
            "count": len(extracted_all_requirements),
            "message": f"Successfully extracted {len(extracted_all_requirements)} requirements with additional project details. You can now generate PRD and BRD.",
            "business_proposal": all_business_proposals,
            "risks_categorized": all_risks_categorized,
            "stakeholders_extracted": all_stakeholders_extracted,
            "ai_notes": all_ai_notes
        }
    except Exception as e:
        print(f"[ERROR] Failed to extract requirements: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to extract requirements: {str(e)}")


@router.post("/extract-manual-requirements")
async def extract_manual_requirements(
    text: str = Form(...),
    project_id: int = Form(...),
    phase_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """
    Extract requirements from manual text input as objectives with sample requirements.
    
    Analyzes the user's input text and suggests comprehensive requirements based on their intent.
    
    Returns:
        - status: success/error
        - requirements: List of objectives with hierarchical requirements
        - count: Number of objectives extracted
    """
    try:
        print(f"[INFO] Extracting requirements from manual text input (length: {len(text)} chars)")
        
        # Get phase to save requirements
        phase = db.query(models.Phase).filter(models.Phase.id == phase_id).first()
        if not phase:
            raise HTTPException(status_code=404, detail="Phase not found")
        
        # Get project info
        project = db.query(models.Project).filter(models.Project.id == project_id).first()
        project_name = project.name if project else "Project"
        
        # Prepare parsed content structure for manual text
        parsed_content = {
            'text': text,
            'filename': 'Manual Input',
            'is_manual': True  # Mark as manual input
        }
        
        print(f"[INFO] Analyzing manual text with OpenAI for project: {project_name}")
        extracted_data, _ = await ai_service.extract_structured_requirements_real(parsed_content)
        
        extracted_requirements = extracted_data.get("requirements", [])
        business_proposal = extracted_data.get("business_proposal", {})
        risks_categorized = extracted_data.get("risks_categorized", {})
        stakeholders_extracted = extracted_data.get("stakeholders", [])
        technology_and_tools = extracted_data.get("technology_and_tools", {})
        success_metrics = extracted_data.get("success_metrics", [])
        ai_notes = extracted_data.get("ai_notes", '')

        if not extracted_requirements:
            return {
                "status": "warning",
                "requirements": [],
                "count": 0,
                "message": "Could not extract requirements from the provided text. Please provide more details."
            }
        
        # Update phase data with all extracted sections
        phase_data = phase.data or {}
        phase_data['gherkinRequirements'] = extracted_requirements # Store the list of FR/NFRs
        phase_data['businessProposal'] = business_proposal
        phase_data['risksCategorized'] = risks_categorized
        phase_data['stakeholdersExtracted'] = stakeholders_extracted
        phase_data['technologyAndTools'] = technology_and_tools
        phase_data['successMetrics'] = success_metrics
        phase_data['aiNotes'] = ai_notes
        phase.data = phase_data
        db.commit()

        print(f"[OK] Extracted comprehensive data from manual text: {len(extracted_requirements)} requirements, {len(stakeholders_extracted)} stakeholders, {len(risks_categorized)} categorized risks, {len(technology_and_tools)} tech categories")
        
        return {
            "status": "success",
            "requirements": extracted_requirements,
            "count": len(extracted_requirements),
            "message": f"Successfully analyzed your input and suggested {len(extracted_requirements)} requirements with additional project details.",
            "business_proposal": business_proposal,
            "risks_categorized": risks_categorized,
            "stakeholders_extracted": stakeholders_extracted,
            "technology_and_tools": technology_and_tools,
            "success_metrics": success_metrics,
            "ai_notes": ai_notes
        }
        
    except Exception as e:
        print(f"[ERROR] Failed to extract manual requirements: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to extract requirements: {str(e)}")


@router.post("/analyze-risks/{phase_id}")
async def analyze_risks(
    phase_id: int,
    db: Session = Depends(get_db)
):
    """
    Analyze risks based on extracted requirements using AI.
    
    Returns:
        - risks: List of risk assessments with priority, impact, and mitigation
        - count: Number of risks identified
    """
    try:
        # Get phase and verify it's Requirements phase
        phase = db.query(models.Phase).filter(models.Phase.id == phase_id).first()
        if not phase:
            raise HTTPException(status_code=404, detail="Phase not found")
        
        # Get project info
        project = db.query(models.Project).filter(models.Project.id == phase.project_id).first()
        project_name = project.name if project else "Project"
        
        # Get requirements from phase data
        phase_data = phase.data or {}
        requirements = phase_data.get('gherkinRequirements', [])
        
        if not requirements:
            # Try legacy format
            requirements = phase_data.get('requirements', [])
        
        # Check for API specifications and convert to requirements format
        api_spec = phase_data.get('apiSpec')
        if api_spec and api_spec.get('paths'):
            print(f"[INFO] Found API specifications, including in risk analysis")
            # Convert API endpoints to requirement-like format for risk analysis
            for path, methods in api_spec.get('paths', {}).items():
                for method, spec in methods.items():
                    api_req = {
                        'feature': f"API Endpoint: {method.upper()} {path}",
                        'as_a': 'API consumer',
                        'i_want': f"to access {spec.get('summary', 'endpoint functionality')}",
                        'so_that': 'I can integrate with the system programmatically',
                        'priority': 'High',
                        'scenarios': [
                            {
                                'title': 'API endpoint is available and secure',
                                'given': ['API endpoint is deployed'],
                                'when': ['client makes request'],
                                'then': ['response is returned with proper status code']
                            }
                        ]
                    }
                    requirements.append(api_req)
        
        if not requirements:
            return {
                "status": "warning",
                "risks": [],
                "count": 0,
                "message": "No requirements found. Please extract requirements first."
            }
        
        print(f"[INFO] Analyzing risks for {len(requirements)} requirements in project: {project_name}")
        
        # Analyze risks using OpenAI
        risks = await ai_service.analyze_risks(requirements, project_name)
        
        # Store risks in phase data
        phase_data['risks'] = risks
        phase.data = phase_data
        phase.updated_at = datetime.utcnow()
        db.commit()
        
        print(f"[SUCCESS] Risk analysis complete: {len(risks)} risks identified")
        
        return {
            "status": "success",
            "risks": risks,
            "count": len(risks),
            "message": f"Successfully identified {len(risks)} risks with mitigation strategies."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Failed to analyze risks: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to analyze risks: {str(e)}")


@router.post("/extract-api-requirements")
async def extract_api_requirements(
    files: List[UploadFile] = File(...),
    project_id: int = Form(...),
    phase_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """
    Extract API requirements from uploaded Excel documents and convert to Swagger/OpenAPI format.
    
    This endpoint:
    1. Parses Excel files containing API endpoint specifications
    2. Converts them to OpenAPI 3.0 format using AI enhancement
    3. Generates both JSON and YAML formats
    4. Creates a high-level summary of the API
    
    Returns:
        - openapi_spec: Complete OpenAPI 3.0 specification (JSON)
        - openapi_yaml: OpenAPI specification in YAML format
        - summary: High-level API summary
        - endpoints_count: Number of API endpoints found
    """
    try:
        # Get project info
        project = db.query(models.Project).filter(models.Project.id == project_id).first()
        project_name = project.name if project else "Project"
        
        all_specs = []
        combined_paths = {}
        combined_tags = []
        api_info = None
        servers = []
        components = {'schemas': {}, 'securitySchemes': {}, 'responses': {}}
        
        print(f"[INFO] Extracting API requirements from {len(files)} file(s) for project: {project_name}")
        
        for file in files:
            # Only process Excel files
            if not file.filename.endswith(('.xlsx', '.xls')):
                print(f"[SKIP] Skipping non-Excel file: {file.filename}")
                continue
            
            print(f"[INFO] Processing Excel file: {file.filename}")
            
            # Save file temporarily
            tmp_path = None
            try:
                # Get file extension safely
                file_ext = '.xlsx'  # Default extension
                if file.filename:
                    file_ext = os.path.splitext(file.filename)[1] or '.xlsx'
                
                with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp:
                    content = await file.read()
                    tmp.write(content)
                    tmp_path = tmp.name
                
                # Parse Excel for API specifications
                print(f"[INFO] Parsing API specifications from: {file.filename}")
                parsed_spec = api_spec_parser.parse_api_excel(tmp_path)
                
                # Store info from first file
                if api_info is None:
                    api_info = parsed_spec.get('info', {})
                    servers = parsed_spec.get('servers', [])
                
                # Merge paths from all files
                for path, methods in parsed_spec.get('paths', {}).items():
                    if path not in combined_paths:
                        combined_paths[path] = {}
                    combined_paths[path].update(methods)
                
                # Merge tags
                for tag in parsed_spec.get('tags', []):
                    if tag not in combined_tags:
                        combined_tags.append(tag)
                
                # Merge components
                for comp_type in ['schemas', 'securitySchemes', 'responses']:
                    if comp_type in parsed_spec.get('components', {}):
                        components[comp_type].update(parsed_spec['components'][comp_type])
                
                print(f"[OK] Parsed {len(parsed_spec.get('paths', {}))} API endpoints from {file.filename}")
                
            except Exception as e:
                print(f"[ERROR] Failed to process {file.filename}: {str(e)}")
                # Continue processing other files instead of failing completely
                continue
                
            finally:
                # Clean up temp file with better error handling
                if tmp_path and os.path.exists(tmp_path):
                    try:
                        # Force close any file handles first
                        import gc
                        gc.collect()
                        
                        # Try to delete the file
                        os.unlink(tmp_path)
                        print(f"[DEBUG] Successfully cleaned up temporary file: {tmp_path}")
                    except PermissionError as pe:
                        print(f"[WARNING] Could not delete temporary file {tmp_path}: {pe}")
                        # On Windows, try to mark for deletion on reboot
                        try:
                            import time
                            # Wait a moment and try again
                            time.sleep(0.1)
                            os.unlink(tmp_path)
                            print(f"[DEBUG] Successfully deleted temporary file on retry")
                        except:
                            print(f"[WARNING] Temporary file {tmp_path} will be cleaned up by system later")
                    except Exception as cleanup_error:
                        print(f"[WARNING] Unexpected error cleaning up {tmp_path}: {cleanup_error}")
        
        if not combined_paths:
            raise HTTPException(
                status_code=400,
                detail="No API endpoints found in the uploaded Excel file(s). Please ensure your Excel files contain API specifications."
            )
        
        # Build combined spec
        combined_spec = {
            'info': api_info or {'title': f'{project_name} API', 'version': '1.0.0', 'description': 'API specification'},
            'servers': servers,
            'paths': combined_paths,
            'tags': combined_tags,
            'components': components
        }
        
        # Enhance with AI
        print("[INFO] Enhancing API specification with AI...")
        enhanced_spec = await ai_service.convert_excel_to_swagger(
            combined_spec,
            f"{project_name} API Requirements"
        )
        
        # Convert to YAML format
        print("[INFO] Converting to YAML format...")
        try:
            openapi_yaml = yaml.dump(enhanced_spec, default_flow_style=False, sort_keys=False, allow_unicode=True)
        except Exception as e:
            print(f"[WARNING] YAML conversion failed: {str(e)}")
            openapi_yaml = "# YAML conversion failed\n# Please use JSON format"
        
        # Generate summary
        print("[INFO] Generating API summary...")
        summary = await ai_service.generate_api_summary(enhanced_spec)
        
        # Count endpoints
        endpoints_count = sum(len(methods) for methods in enhanced_spec.get('paths', {}).values())
        
        # Store in phase data
        phase = db.query(models.Phase).filter(models.Phase.id == phase_id).first()
        if phase:
            # Safely get and update the phase data
            import json
            phase_data_dict = {}
            if phase.data is not None:
                # If phase.data is already a dict, use it directly
                if isinstance(phase.data, dict):
                    phase_data_dict = phase.data.copy()
                else:
                    # If it's a string or other type, try to parse as JSON
                    try:
                        phase_data_dict = json.loads(str(phase.data))
                    except (json.JSONDecodeError, TypeError):
                        phase_data_dict = {}
            
            # Update the phase data with API information
            phase_data_dict.update({
                'apiSpec': enhanced_spec,
                'apiSummary': summary,
                'apiEndpointsCount': endpoints_count
            })
            
            # Update the database record using the query.update method
            try:
                db.query(models.Phase).filter(models.Phase.id == phase_id).update({
                    'data': phase_data_dict,
                    'updated_at': datetime.utcnow()
                })
                db.commit()
                print(f"[OK] Stored API specification in phase data")
            except Exception as db_error:
                print(f"[WARNING] Could not store in database: {db_error}")
                db.rollback()
        
        print(f"[SUCCESS] API extraction complete: {endpoints_count} endpoints")
        
        return {
            "status": "success",
            "openapi_spec": enhanced_spec,
            "openapi_yaml": openapi_yaml,
            "summary": summary,
            "endpoints_count": endpoints_count,
            "message": f"Successfully extracted and converted {endpoints_count} API endpoints to OpenAPI 3.0 format",
            "swagger_editor_url": "https://editor.swagger.io/",
            "usage": "Copy the openapi_yaml or openapi_spec and paste into Swagger Editor to visualize"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Failed to extract API requirements: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to extract API requirements: {str(e)}")


# ============================================================================
# PHASE 5 PERSISTENCE ENDPOINTS
# ============================================================================

@router.get("/phase5/deliverable/{project_id}/{story_id}")
async def get_phase5_deliverable(project_id: int, story_id: str, db: Session = Depends(get_db)):
    """
    Retrieve a single persisted Phase 5 deliverable for a user story
    
    Returns: Formatted deliverable with code, tests, api, readme
    """
    try:
        deliverable = db.query(models.Phase5Deliverable).filter(
            models.Phase5Deliverable.project_id == project_id,
            models.Phase5Deliverable.user_story_id == story_id
        ).first()
        
        if not deliverable:
            return {"found": False, "deliverable": None}
        
        # Format the response to match frontend expectations
        result = {
            "found": True,
            "deliverable": {
                "code": deliverable.code_content or [],
                "tests": deliverable.tests_content or [],
                "api": {
                    "endpoints": deliverable.api_endpoints or []
                },
                "readme": deliverable.readme_content or "",
                "metadata": {
                    "story_id": deliverable.user_story_id,
                    "story_title": deliverable.story_title,
                    "components_used": deliverable.selected_components or [],
                    "generated_for": f"{deliverable.story_title}",
                    "language": deliverable.language,
                    "test_framework": deliverable.test_framework,
                    "generated_at": deliverable.generated_at.isoformat() if deliverable.generated_at else None,
                    "updated_at": deliverable.updated_at.isoformat() if deliverable.updated_at else None
                }
            }
        }
        
        return result
        
    except Exception as e:
        print(f"[ERROR] Failed to retrieve Phase 5 deliverable: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve deliverable: {str(e)}")


@router.post("/phase5/deliverables/bulk")
async def get_phase5_deliverables_bulk(
    request_data: dict = Body(...),
    db: Session = Depends(get_db)
):
    """
    Retrieve multiple Phase 5 deliverables at once
    
    Request body:
    {
        "project_id": int,
        "story_ids": ["id1", "id2", ...]
    }
    
    Returns: {
        "id1": deliverable,
        "id2": deliverable,
        ...
    }
    """
    try:
        project_id = request_data.get("project_id")
        story_ids = request_data.get("story_ids", [])
        
        if not project_id or not story_ids:
            return {}
        
        deliverables = db.query(models.Phase5Deliverable).filter(
            models.Phase5Deliverable.project_id == project_id,
            models.Phase5Deliverable.user_story_id.in_(story_ids)
        ).all()
        
        result = {}
        for deliverable in deliverables:
            result[str(deliverable.user_story_id)] = {
                "code": deliverable.code_content or [],
                "tests": deliverable.tests_content or [],
                "api": {
                    "endpoints": deliverable.api_endpoints or []
                },
                "readme": deliverable.readme_content or "",
                "metadata": {
                    "story_id": deliverable.user_story_id,
                    "story_title": deliverable.story_title,
                    "components_used": deliverable.selected_components or [],
                    "generated_for": f"{deliverable.story_title}",
                    "language": deliverable.language,
                    "test_framework": deliverable.test_framework,
                    "generated_at": deliverable.generated_at.isoformat() if deliverable.generated_at else None,
                    "updated_at": deliverable.updated_at.isoformat() if deliverable.updated_at else None
                }
            }
        
        return result
        
    except Exception as e:
        print(f"[ERROR] Failed to retrieve Phase 5 deliverables: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve deliverables: {str(e)}")

