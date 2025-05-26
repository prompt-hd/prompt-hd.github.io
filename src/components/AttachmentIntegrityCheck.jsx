import { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, AlertCircle, ExternalLink, ArrowLeft, Upload, FileArchive, Zap, Search, Link, Brain } from 'lucide-react';
import JSZip from 'jszip';

const AttachmentIntegrityCheck = ({ promptData, onClose }) => {
  const [checkResults, setCheckResults] = useState([]);
  const [summary, setSummary] = useState({ total: 0, exists: 0, missing: 0, unchecked: 0 });
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAnalysisAnimation, setShowAnalysisAnimation] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [currentProgress, setCurrentProgress] = useState(0);
  const [animationFiles, setAnimationFiles] = useState([]);
  const [extractedAttachments, setExtractedAttachments] = useState([]);
  const [matchingPairs, setMatchingPairs] = useState([]);
  const [currentAnalyzing, setCurrentAnalyzing] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [showQuickResults, setShowQuickResults] = useState(false);
  const [overallStatus, setOverallStatus] = useState('analyzing'); // 'analyzing', 'success', 'warning', 'error'
  const fileInputRef = useRef(null);

  // 모든 첨부파일 목록 생성
  const initializeAttachments = () => {
    const results = [];
    let totalCount = 0;

    for (let slideIndex = 0; slideIndex < promptData.slides.length; slideIndex++) {
      const slide = promptData.slides[slideIndex];
      
      if (slide.attachments && slide.attachments.length > 0) {
        for (let attachmentIndex = 0; attachmentIndex < slide.attachments.length; attachmentIndex++) {
          const attachment = slide.attachments[attachmentIndex];
          totalCount++;

          let attachmentText = '';
          let attachmentUrl = '';

          // 첨부파일 형식 파싱
          if (typeof attachment === 'string') {
            attachmentText = attachment;
            // 문자열에서 URL 추출 시도
            const urlMatch = attachment.match(/(https?:\/\/[^\s]+)/);
            attachmentUrl = urlMatch ? urlMatch[1] : '';
          } else if (attachment && typeof attachment === 'object') {
            attachmentText = attachment.text || '';
            attachmentUrl = attachment.url || '';
          }

          const checkResult = {
            slideIndex,
            slideTitle: slide.title,
            attachmentIndex,
            attachmentText,
            attachmentUrl,
            status: 'unchecked', // 'unchecked', 'exists', 'missing'
            userChecked: false,
            fileName: extractFileName(attachmentText) // 파일명 추출
          };

          results.push(checkResult);
        }
      }
    }

    setCheckResults(results);
    updateSummary(results);
  };

  // 첨부파일 텍스트에서 파일명 추출
  const extractFileName = (text) => {
    // 먼저 "폴더 >" 패턴을 찾아서 그 이후의 모든 텍스트를 파일명으로 간주
    const folderPattern = /폴더\s*>\s*(.+)$/;
    const folderMatch = text.match(folderPattern);
    if (folderMatch && folderMatch[1]) {
      const fullPath = folderMatch[1].trim();
      // 경로에서 마지막 파일명만 추출 (> 기호로 분리)
      const pathParts = fullPath.split('>').map(part => part.trim());
      return pathParts[pathParts.length - 1]; // 마지막 부분이 실제 파일명
    }

    // "파일 >" 패턴도 동일하게 처리
    const filePattern = /파일\s*>\s*(.+)$/;
    const fileMatch = text.match(filePattern);
    if (fileMatch && fileMatch[1]) {
      const fullPath = fileMatch[1].trim();
      // 경로에서 마지막 파일명만 추출 (> 기호로 분리)
      const pathParts = fullPath.split('>').map(part => part.trim());
      return pathParts[pathParts.length - 1]; // 마지막 부분이 실제 파일명
    }

    // 일반적인 ">" 이후의 텍스트 (마지막 > 이후의 모든 내용)
    const lastArrowPattern = />\s*([^>]+)$/;
    const lastArrowMatch = text.match(lastArrowPattern);
    if (lastArrowMatch && lastArrowMatch[1]) {
      return lastArrowMatch[1].trim();
    }

    // 다양한 패턴으로 파일명 추출 시도 (한글 지원 강화)
    const patterns = [
      // 확장자가 있는 파일명 (한글, 영문, 숫자, 공백, 특수문자 포함)
      /([가-힣a-zA-Z0-9\s_\-\.\[\]\(\)]+\.[a-zA-Z0-9]+)$/,
      // 대괄호 안의 파일명
      /\[([가-힣a-zA-Z0-9\s_\-\.]+[가-힣a-zA-Z0-9\s_\-\.\[\]\(\)]*)\]/,
      // 따옴표 안의 파일명
      /["']([가-힣a-zA-Z0-9\s_\-\.]+[가-힣a-zA-Z0-9\s_\-\.\[\]\(\)]*?)["']/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let fileName = match[1].trim();
        // 불필요한 문자 제거
        fileName = fileName.replace(/[<>]/g, '').trim();
        if (fileName.length > 0) {
          return fileName;
        }
      }
    }

    // 패턴이 맞지 않으면 전체 텍스트에서 파일명 같은 부분 찾기
    const words = text.split(/[\s>]+/);
    for (const word of words) {
      // 확장자가 있는 단어 찾기 (한글 포함)
      if (/[가-힣a-zA-Z0-9_\-]+\.[a-zA-Z0-9]+/.test(word) && word.length > 3) {
        return word.replace(/[<>\[\]"']/g, '').trim();
      }
    }

    // 마지막으로 한글이 포함된 의미있는 텍스트 추출
    const cleanText = text.replace(/[<>]/g, '').trim();
    const meaningfulText = cleanText.split(/[>\s]+/).find(part => 
      part.length > 2 && /[가-힣a-zA-Z0-9]/.test(part)
    );

    return meaningfulText || cleanText;
  };

  // 문자열 정규화 함수 - 보이지 않는 문자와 인코딩 문제 해결
  const normalizeString = (str) => {
    return str
      .normalize('NFC') // 유니코드 정규화
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // 제로 너비 문자 제거
      .replace(/[\u00A0]/g, ' ') // 논브레이킹 스페이스를 일반 공백으로
      .replace(/\s+/g, ' ') // 모든 공백을 단일 공백으로
      .trim();
  };

  // 애니메이션 단계별 메시지
  const getStepMessage = (step) => {
    switch (step) {
      case 'extracting': return 'ZIP 파일 압축 해제 중...';
      case 'scanning': return '슬라이드에서 첨부파일 정보 스캔 중...';
      case 'extracting-filenames': return 'AI가 파일명 추출 중...';
      case 'analyzing': return '파일 매칭 분석 중...';
      case 'matching': return '유사도 계산 및 매칭 중...';
      case 'complete': return '분석 완료!';
      default: return '처리 중...';
    }
  };

  // 애니메이션과 함께 파일 분석 실행
  const runAnimatedAnalysis = async (fileList) => {
    setShowAnalysisAnimation(true);
    setCurrentProgress(0);
    setOverallStatus('analyzing');
    
    const baseDelay = (ms) => ms / animationSpeed;
    const checkPause = async () => {
      while (isPaused) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    };
    
    // 1단계: 슬라이드에서 첨부파일 목록 추출
    setAnalysisStep('extracting-attachments');
    const attachmentsList = [];
    const seenFileNames = new Set(); // 중복 파일명 추적용
    
    for (let slideIndex = 0; slideIndex < promptData.slides.length; slideIndex++) {
      const slide = promptData.slides[slideIndex];
      if (slide.attachments && slide.attachments.length > 0) {
        for (let attachmentIndex = 0; attachmentIndex < slide.attachments.length; attachmentIndex++) {
          const attachment = slide.attachments[attachmentIndex];
          const attachmentText = typeof attachment === 'string' ? attachment : attachment.text || '';
          const fileName = extractFileName(attachmentText);
          
          if (fileName) {
            // 파일명 정규화 후 중복 체크
            const normalizedFileName = normalizeString(fileName).toLowerCase();
            
            // 중복이 아닌 경우에만 추가
            if (!seenFileNames.has(normalizedFileName)) {
              seenFileNames.add(normalizedFileName);
              
              attachmentsList.push({
                id: `${slideIndex}-${attachmentIndex}`,
                slideIndex,
                slideTitle: slide.title,
                attachmentIndex,
                attachmentText,
                fileName,
                status: 'pending', // 'pending', 'scanning', 'found', 'not-found'
                matchedFile: null,
                matchType: null,
                similarity: 0
              });
            }
          }
        }
      }
      setCurrentProgress((slideIndex + 1) / promptData.slides.length * 20); // 20%까지
      await new Promise(resolve => setTimeout(resolve, baseDelay(100)));
    }
    
    setExtractedAttachments(attachmentsList);
    await new Promise(resolve => setTimeout(resolve, baseDelay(500)));
    
    // 2단계: 압축 파일 해제 및 표시
    setAnalysisStep('extracting-files');
    setAnimationFiles([]);
    
    for (let i = 0; i < fileList.length; i++) {
      await checkPause();
      await new Promise(resolve => setTimeout(resolve, baseDelay(80)));
      setAnimationFiles(prev => [...prev, { ...fileList[i], status: 'ready' }]);
      setCurrentProgress(20 + (i + 1) / fileList.length * 20); // 40%까지
    }
    
    await new Promise(resolve => setTimeout(resolve, baseDelay(800)));
    
    // 3단계: 하나씩 스캔 및 매칭
    setAnalysisStep('scanning-matching');
    const finalResults = [];
    let reorderedFileList = [...fileList]; // 재정렬될 파일 목록
    
    for (let i = 0; i < attachmentsList.length; i++) {
      await checkPause();
      
      const currentAttachment = attachmentsList[i];
      
      // 현재 스캔 중인 첨부파일 표시
      setCurrentAnalyzing(currentAttachment);
      
      // 왼쪽 리스트에서 현재 아이템을 스캔 상태로 변경
      setExtractedAttachments(prev => 
        prev.map(item => 
          item.id === currentAttachment.id 
            ? { ...item, status: 'scanning' }
            : { ...item, status: item.status === 'found' ? 'found' : 'pending' }
        )
      );
      
      await new Promise(resolve => setTimeout(resolve, baseDelay(300)));
      
      // 오른쪽 파일들을 하나씩 스캔
      let foundMatch = false;
      let matchedFileInfo = null;
      let matchedFileIndex = -1;
      
      for (let j = 0; j < reorderedFileList.length; j++) {
        await checkPause();
        
        const currentFile = reorderedFileList[j];
        
        // 오른쪽 파일을 스캔 중 상태로 표시
        setAnimationFiles(prev => 
          prev.map(file => 
            file.name === currentFile.name 
              ? { ...file, status: 'scanning' }
              : { ...file, status: file.status === 'matched' ? 'matched' : 'ready' }
          )
        );
        
        await new Promise(resolve => setTimeout(resolve, baseDelay(200)));
        
        // 실제 매칭 로직
        const fileName = normalizeString(currentFile.name);
        const targetFileName = normalizeString(currentAttachment.fileName);
        const actualFileName = fileName.split('/').pop();
        const actualTargetFileName = targetFileName.split('/').pop();
        
        let isMatch = false;
        let matchType = '';
        let similarity = 0;
        
        // 정확한 매칭
        if (actualFileName.toLowerCase() === actualTargetFileName.toLowerCase()) {
          isMatch = true;
          matchType = '정확한 매칭';
          similarity = 1.0;
        }
        // 유사도 계산
        else {
          similarity = calculateSimilarity(actualFileName.toLowerCase(), actualTargetFileName.toLowerCase());
          if (similarity > 0.9) {
            isMatch = true;
            matchType = `높은 유사도 매칭`;
          }
          // 부분 매칭
          else if (actualFileName.toLowerCase().includes(actualTargetFileName.toLowerCase()) && actualTargetFileName.length > 5) {
            isMatch = true;
            matchType = '부분 매칭';
            similarity = 0.8;
          }
        }
        
        if (isMatch && !foundMatch) {
          foundMatch = true;
          matchedFileIndex = j;
          matchedFileInfo = {
            fileName: currentFile.name,
            matchType,
            similarity
          };
          
          // 매칭된 파일 하이라이팅 (더 오래 표시)
          setAnimationFiles(prev => 
            prev.map(file => 
              file.name === currentFile.name 
                ? { ...file, status: 'matched' }
                : { ...file, status: file.status === 'matched' ? 'matched' : 'ready' }
            )
          );
          
          await new Promise(resolve => setTimeout(resolve, baseDelay(800))); // 하이라이팅 시간
          break;
        } else {
          // 매칭되지 않은 파일은 다시 ready 상태로
          setAnimationFiles(prev => 
            prev.map(file => 
              file.name === currentFile.name 
                ? { ...file, status: 'ready' }
                : file
            )
          );
        }
      }
      
      // 매칭된 파일이 있으면 재정렬 애니메이션
      if (foundMatch && matchedFileIndex !== -1) {
        // 매칭된 파일을 현재 위치(i번째)로 이동
        const matchedFile = reorderedFileList[matchedFileIndex];
        
        // 재정렬: 매칭된 파일을 i번째 위치로 이동
        const newOrderedList = [...reorderedFileList];
        newOrderedList.splice(matchedFileIndex, 1); // 원래 위치에서 제거
        newOrderedList.splice(i, 0, matchedFile); // i번째 위치에 삽입
        
        reorderedFileList = newOrderedList;
        
        // 재정렬 애니메이션을 위해 파일 목록 업데이트
        setAnimationFiles(prev => {
          const newFiles = reorderedFileList.map((file, index) => ({
            ...file,
            status: file.name === matchedFile.name ? 'matched' : 
                   prev.find(f => f.name === file.name)?.status || 'ready',
            reorderAnimation: true // 재정렬 애니메이션 플래그
          }));
          return newFiles;
        });
        
        // 재정렬 애니메이션 시간
        await new Promise(resolve => setTimeout(resolve, baseDelay(600)));
        
        // 애니메이션 플래그 제거
        setAnimationFiles(prev => 
          prev.map(file => ({ ...file, reorderAnimation: false }))
        );
      }
      
      // 왼쪽 리스트 업데이트 (체크 표시)
      const finalStatus = foundMatch ? 'found' : 'not-found';
      setExtractedAttachments(prev => 
        prev.map(item => 
          item.id === currentAttachment.id 
            ? { 
                ...item, 
                status: finalStatus,
                matchedFile: matchedFileInfo?.fileName || null,
                matchType: matchedFileInfo?.matchType || null,
                similarity: matchedFileInfo?.similarity || 0
              }
            : item
        )
      );
      
      finalResults.push({
        ...currentAttachment,
        status: finalStatus,
        matchedFile: matchedFileInfo?.fileName || null,
        matchType: matchedFileInfo?.matchType || null,
        similarity: matchedFileInfo?.similarity || 0
      });
      
      // 체크 표시 애니메이션 시간
      await new Promise(resolve => setTimeout(resolve, baseDelay(400)));
      
      setCurrentProgress(40 + (i + 1) / attachmentsList.length * 50); // 90%까지
    }
    
    setMatchingPairs(finalResults);
    setCurrentAnalyzing(null);
    
    // 전체 상태 결정
    const successCount = finalResults.filter(item => item.status === 'found').length;
    const successRate = successCount / finalResults.length;
    if (successRate >= 0.9) {
      setOverallStatus('success');
    } else if (successRate >= 0.7) {
      setOverallStatus('warning');
    } else {
      setOverallStatus('error');
    }
    
    // 4단계: 완료
    setAnalysisStep('complete');
    setCurrentProgress(100);
    setShowQuickResults(true);
    
    await new Promise(resolve => setTimeout(resolve, baseDelay(1000)));
    
    // 실제 결과 업데이트 (중복 제거된 결과를 기반으로)
    const updatedResults = [...checkResults];
    
    // 중복 제거된 결과를 원래 checkResults에 매핑
    finalResults.forEach((result) => {
      // 원래 checkResults에서 같은 파일명을 가진 모든 항목 찾기
      for (let i = 0; i < updatedResults.length; i++) {
        const originalResult = updatedResults[i];
        const originalFileName = normalizeString(originalResult.fileName || '').toLowerCase();
        const resultFileName = normalizeString(result.fileName).toLowerCase();
        
        if (originalFileName === resultFileName && !originalResult.userChecked) {
          updatedResults[i] = {
            ...originalResult,
            status: result.status === 'found' ? 'exists' : 'missing',
            userChecked: true,
            autoChecked: true,
            matchedFile: result.matchedFile,
            matchType: result.matchType,
            similarity: result.similarity
          };
        }
      }
    });
    
    setCheckResults(updatedResults);
    updateSummary(updatedResults);
    
    // 애니메이션 종료
    setTimeout(() => {
      setShowAnalysisAnimation(false);
    }, baseDelay(2000));
  };

  // 압축파일 업로드 처리
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.zip')) {
      alert('ZIP 파일만 업로드 가능합니다.');
      return;
    }

    setIsProcessing(true);
    
    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      
      const fileList = [];
      zipContent.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) { // 디렉토리가 아닌 파일만
          fileList.push({
            name: zipEntry.name,
            path: relativePath,
            size: zipEntry._data ? zipEntry._data.uncompressedSize : 0
          });
        }
      });

      setUploadedFiles(fileList);
      
      // 자동으로 파일 존재 여부 체크
      await runAnimatedAnalysis(fileList);
      
      alert(`압축파일이 성공적으로 처리되었습니다. ${fileList.length}개의 파일을 찾았습니다.`);
    } catch (error) {
      console.error('압축파일 처리 오류:', error);
      alert('압축파일 처리 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setIsProcessing(false);
      // 파일 입력 초기화
      event.target.value = '';
    }
  };

  // 업로드된 파일 목록과 첨부파일 목록 비교하여 자동 체크
  const autoCheckFiles = async (fileList) => {
    const updatedResults = [...checkResults];
    let matchDetails = [];
    
    // 디버깅: 업로드된 파일명 출력
    console.log('=== 업로드된 파일 목록 ===');
    fileList.forEach(file => {
      console.log(`- "${file.name}" (길이: ${file.name.length})`);
      // 문자 코드 출력 (처음 50자만)
      const codes = Array.from(file.name.slice(0, 50)).map(c => c.charCodeAt(0));
      console.log(`  문자 코드: ${codes.join(', ')}`);
    });
    
    updatedResults.forEach((result, index) => {
      if (result.fileName) {
        // 파일명으로 매칭 (대소문자 무시, 경로 무시, 한글 지원)
        let matchedFile = null;
        let matchType = '';
        let similarFiles = [];
        
        // 디버깅: 현재 찾는 파일
        console.log(`\n찾는 파일: "${result.fileName}" (길이: ${result.fileName.length})`);
        const targetCodes = Array.from(result.fileName.slice(0, 50)).map(c => c.charCodeAt(0));
        console.log(`  문자 코드: ${targetCodes.join(', ')}`);
        
        const found = fileList.some(file => {
          const fileName = normalizeString(file.name);
          const targetFileName = normalizeString(result.fileName);
          
          // 경로에서 실제 파일명만 추출
          const actualFileName = fileName.split('/').pop();
          const actualTargetFileName = targetFileName.split('/').pop();
          
          // 디버깅: 정규화된 파일명 비교
          if (actualFileName.toLowerCase().includes(actualTargetFileName.toLowerCase().slice(0, 20))) {
            console.log(`  비교: "${actualFileName}" vs "${actualTargetFileName}"`);
            console.log(`  같은가? ${actualFileName.toLowerCase() === actualTargetFileName.toLowerCase()}`);
          }
          
          // 유사도 계산을 위한 점수
          let similarityScore = 0;
          
          // 1. 정확한 파일명 매칭 (대소문자 구분 없이)
          if (actualFileName.toLowerCase() === actualTargetFileName.toLowerCase()) {
            matchedFile = file.name;
            matchType = '정확한 매칭';
            console.log(`✅ 정확한 매칭 찾음: ${file.name}`);
            return true;
          }
          
          // 2. 확장자 제거하고 정확한 매칭
          const fileNameWithoutExt = actualFileName.replace(/\.[^/.]+$/, "").toLowerCase();
          const targetFileNameWithoutExt = actualTargetFileName.replace(/\.[^/.]+$/, "").toLowerCase();
          
          if (fileNameWithoutExt === targetFileNameWithoutExt) {
            matchedFile = file.name;
            matchType = '확장자 제외 정확한 매칭';
            console.log(`✅ 확장자 제외 매칭 찾음: ${file.name}`);
            return true;
          }
          
          // 3. 대괄호와 특수문자 정규화 후 매칭
          const cleanFileName = fileNameWithoutExt
            .replace(/[\[\](){}]/g, '') // 대괄호, 괄호 제거
            .replace(/[_\-\s]+/g, '') // 언더스코어, 하이픈, 공백 제거
            .toLowerCase();
          const cleanTargetFileName = targetFileNameWithoutExt
            .replace(/[\[\](){}]/g, '')
            .replace(/[_\-\s]+/g, '')
            .toLowerCase();
          
          if (cleanFileName === cleanTargetFileName) {
            matchedFile = file.name;
            matchType = '특수문자 제거 후 정확한 매칭';
            console.log(`✅ 특수문자 제거 후 매칭 찾음: ${file.name}`);
            return true;
          }
          
          // 4. 레벤슈타인 거리 기반 유사도 (90% 이상 일치)
          const similarity = calculateSimilarity(actualFileName.toLowerCase(), actualTargetFileName.toLowerCase());
          if (similarity > 0.9) {
            matchedFile = file.name;
            matchType = `높은 유사도 매칭 (${Math.round(similarity * 100)}%)`;
            console.log(`✅ 높은 유사도 매칭 찾음: ${file.name} (${Math.round(similarity * 100)}%)`);
            return true;
          }
          
          // 5. 부분 매칭 - 타겟이 파일명에 포함되거나 그 반대
          if (actualFileName.toLowerCase().includes(actualTargetFileName.toLowerCase()) && actualTargetFileName.length > 5) {
            matchedFile = file.name;
            matchType = '부분 매칭 (타겟이 파일명에 포함)';
            console.log(`✅ 부분 매칭 찾음: ${file.name}`);
            return true;
          }
          
          if (actualTargetFileName.toLowerCase().includes(actualFileName.toLowerCase()) && actualFileName.length > 5) {
            matchedFile = file.name;
            matchType = '부분 매칭 (파일명이 타겟에 포함)';
            console.log(`✅ 부분 매칭 찾음: ${file.name}`);
            return true;
          }
          
          // 6. 숫자와 점으로 시작하는 파일명 특별 처리
          const numericPattern = /^(\d+\.?\d*)\s*(.*)$/;
          const targetNumMatch = targetFileNameWithoutExt.match(numericPattern);
          const fileNumMatch = fileNameWithoutExt.match(numericPattern);
          
          if (targetNumMatch && fileNumMatch && targetNumMatch[1] === fileNumMatch[1]) {
            const targetText = normalizeString(targetNumMatch[2] || '').toLowerCase();
            const fileText = normalizeString(fileNumMatch[2] || '').toLowerCase();
            
            // 텍스트 부분의 유사도 확인
            if (targetText && fileText) {
              const textSimilarity = calculateSimilarity(fileText, targetText);
              if (textSimilarity > 0.7) {
                matchedFile = file.name;
                matchType = `파일 번호와 텍스트 매칭 (유사도: ${Math.round(textSimilarity * 100)}%)`;
                console.log(`✅ 파일 번호와 텍스트 매칭 찾음: ${file.name}`);
                return true;
              }
            }
          }
          
          // 유사도 점수 저장 (나중에 표시용)
          if (similarity > 0.5) {
            similarFiles.push({
              fileName: file.name,
              score: similarity,
              matchedWords: 0,
              totalWords: 0
            });
          }
          
          return false;
        });
        
        // 유사한 파일들을 점수순으로 정렬
        similarFiles.sort((a, b) => b.score - a.score);
        
        if (!found) {
          console.log(`❌ 매칭 실패: "${result.fileName}"`);
          if (similarFiles.length > 0) {
            console.log(`   유사한 파일들:`, similarFiles.slice(0, 3));
          }
        }
        
        updatedResults[index] = {
          ...result,
          status: found ? 'exists' : 'missing',
          userChecked: true,
          autoChecked: true,
          matchedFile: matchedFile,
          matchType: matchType,
          similarFiles: found ? [] : similarFiles.slice(0, 3)
        };

        // 디버깅 정보 수집
        matchDetails.push({
          originalText: result.attachmentText,
          extractedFileName: result.fileName,
          found: found,
          matchedFile: matchedFile,
          matchType: matchType,
          similarFiles: similarFiles.slice(0, 3)
        });
      }
    });
    
    setCheckResults(updatedResults);
    updateSummary(updatedResults);
    
    // 매칭 결과 요약
    console.log('\n=== 매칭 결과 요약 ===');
    console.log(`전체: ${matchDetails.length}개`);
    console.log(`매칭 성공: ${matchDetails.filter(m => m.found).length}개`);
    console.log(`매칭 실패: ${matchDetails.filter(m => !m.found).length}개`);
  };

  // 레벤슈타인 거리 기반 문자열 유사도 계산
  const calculateSimilarity = (str1, str2) => {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    const distance = matrix[len2][len1];
    return 1 - distance / Math.max(len1, len2);
  };

  // 요약 정보 업데이트
  const updateSummary = (results) => {
    const total = results.length;
    const exists = results.filter(r => r.status === 'exists').length;
    const missing = results.filter(r => r.status === 'missing').length;
    const unchecked = results.filter(r => r.status === 'unchecked').length;

    setSummary({ total, exists, missing, unchecked });
  };

  // 사용자가 직접 파일 존재 여부 체크
  const handleUserCheck = (index, status) => {
    const updatedResults = [...checkResults];
    updatedResults[index] = {
      ...updatedResults[index],
      status: status,
      userChecked: true,
      autoChecked: false
    };
    setCheckResults(updatedResults);
    updateSummary(updatedResults);
  };

  // 모든 체크 초기화
  const resetAllChecks = () => {
    const resetResults = checkResults.map(result => ({
      ...result,
      status: 'unchecked',
      userChecked: false,
      autoChecked: false
    }));
    setCheckResults(resetResults);
    updateSummary(resetResults);
    setUploadedFiles([]);
  };

  // 컴포넌트 마운트 시 첨부파일 목록 초기화
  useEffect(() => {
    initializeAttachments();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'exists':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'missing':
        return <XCircle className="text-red-500" size={20} />;
      case 'unchecked':
        return <AlertCircle className="text-gray-400" size={20} />;
      default:
        return <AlertCircle className="text-gray-400" size={20} />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'exists':
        return '존재함';
      case 'missing':
        return '없음';
      case 'unchecked':
        return '미확인';
      default:
        return '미확인';
    }
  };

  return (
    <div className="attachment-integrity-check">
      {/* 애니메이션 오버레이 */}
      {showAnalysisAnimation && (
        <div className="analysis-animation-overlay">
          <div className="analysis-container">
            {/* 사용자 통제 패널 */}
            <div className="control-panel">
              <div className="control-left">
                <button 
                  className={`control-btn ${isPaused ? 'play' : 'pause'}`}
                  onClick={() => setIsPaused(!isPaused)}
                >
                  {isPaused ? '▶️' : '⏸️'}
                </button>
                <div className="speed-control">
                  <span>속도</span>
                  <div className="speed-buttons">
                    {[0.5, 1, 2, 4].map(speed => (
                      <button
                        key={speed}
                        className={`speed-btn ${animationSpeed === speed ? 'active' : ''}`}
                        onClick={() => setAnimationSpeed(speed)}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="control-right">
                <div className={`status-indicator ${overallStatus}`}>
                  <div className="status-icon">
                    {overallStatus === 'success' && '✅'}
                    {overallStatus === 'warning' && '⚠️'}
                    {overallStatus === 'error' && '❌'}
                    {overallStatus === 'analyzing' && '🔍'}
                  </div>
                  <span className="status-text">
                    {overallStatus === 'success' && '모든 파일 확인됨'}
                    {overallStatus === 'warning' && '일부 파일 누락'}
                    {overallStatus === 'error' && '다수 파일 누락'}
                    {overallStatus === 'analyzing' && '분석 중...'}
                  </span>
                </div>
              </div>
            </div>

            <div className="analysis-header">
              <Brain className="analysis-icon" size={32} />
              <h3>AI 파일 분석 시스템</h3>
              <div className="analysis-step-indicator">
                {getStepMessage(analysisStep)}
              </div>
            </div>

            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${currentProgress}%` }}
                />
              </div>
              <span className="progress-text">{Math.round(currentProgress)}%</span>
            </div>

            {/* 빠른 결과 표시 */}
            {showQuickResults && (
              <div className="quick-results">
                <div className="results-grid">
                  <div className="result-card success">
                    <div className="card-icon">✅</div>
                    <div className="card-number">{matchingPairs.filter(p => p.status === 'found').length}</div>
                    <div className="card-label">매칭 성공</div>
                  </div>
                  <div className="result-card error">
                    <div className="card-icon">❌</div>
                    <div className="card-number">{matchingPairs.filter(p => p.status === 'not-found').length}</div>
                    <div className="card-label">매칭 실패</div>
                  </div>
                  <div className="result-card info">
                    <div className="card-icon">📊</div>
                    <div className="card-number">{matchingPairs.length > 0 ? Math.round(matchingPairs.filter(p => p.status === 'found').length / matchingPairs.length * 100) : 0}%</div>
                    <div className="card-label">정확도</div>
                  </div>
                </div>
              </div>
            )}

            {/* 첨부파일 목록 추출 스테이지 */}
            {analysisStep === 'extracting-attachments' && (
              <div className="analysis-stage">
                <div className="stage-header">
                  <Search size={20} />
                  <span>슬라이드에서 첨부파일 추출</span>
                  <div className="stage-counter">{extractedAttachments.length}개 발견</div>
                </div>
                <div className="extraction-preview">
                  <div className="slides-scanning">
                    {promptData.slides.map((slide, index) => (
                      <div 
                        key={index} 
                        className={`slide-scan-item ${
                          index <= Math.floor(currentProgress / 20 * promptData.slides.length) ? 'scanned' : ''
                        }`}
                      >
                        <div className="slide-number">{index + 1}</div>
                        <div className="slide-info">
                          <div className="slide-name">{slide.title}</div>
                          <div className="attachment-count">
                            {slide.attachments ? slide.attachments.length : 0}개 첨부파일
                          </div>
                        </div>
                        <div className="scan-progress"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 압축 파일 해제 스테이지 */}
            {analysisStep === 'extracting-files' && (
              <div className="analysis-stage">
                <div className="stage-header">
                  <FileArchive size={20} />
                  <span>압축 파일 해제</span>
                  <div className="stage-counter">{animationFiles.length}/{uploadedFiles.length}개 파일</div>
                </div>
                <div className="files-extraction">
                  <div className="extraction-animation">
                    {animationFiles.map((file, index) => (
                      <div 
                        key={index} 
                        className="extracted-file"
                        style={{ animationDelay: `${index * 80}ms` }}
                      >
                        <div className="file-icon">📄</div>
                        <div className="file-name">{file.name.split('/').pop()}</div>
                        <div className="file-path">{file.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 스캔 및 매칭 스테이지 */}
            {analysisStep === 'scanning-matching' && (
              <div className="analysis-stage">
                <div className="stage-header">
                  <Zap size={20} />
                  <span>파일 매칭 검증</span>
                  <div className="stage-counter">
                    {extractedAttachments.filter(item => item.status === 'found').length}/{extractedAttachments.length}개 완료
                  </div>
                </div>
                
                <div className="dual-scan-view">
                  {/* 왼쪽: 첨부파일 목록 */}
                  <div className="attachments-panel">
                    <div className="panel-title">
                      <span>📋 슬라이드 첨부파일</span>
                      <span className="panel-count">{extractedAttachments.length}개</span>
                    </div>
                    <div className="attachments-list">
                      {extractedAttachments.map((attachment, index) => (
                        <div 
                          key={attachment.id} 
                          className={`attachment-item ${attachment.status}`}
                        >
                          <div className="attachment-status-icon">
                            {attachment.status === 'pending' && '⏳'}
                            {attachment.status === 'scanning' && '🔍'}
                            {attachment.status === 'found' && '✅'}
                            {attachment.status === 'not-found' && '❌'}
                          </div>
                          <div className="attachment-info">
                            <div className="attachment-filename">{attachment.fileName}</div>
                            <div className="attachment-source">
                              슬라이드 {attachment.slideIndex + 1}: {attachment.slideTitle}
                            </div>
                            {attachment.matchedFile && (
                              <div className="match-info">
                                → {attachment.matchedFile.split('/').pop()}
                                <span className="match-type">{attachment.matchType}</span>
                              </div>
                            )}
                          </div>
                          {attachment.status === 'scanning' && (
                            <div className="scanning-beam"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 가운데: 스캔 연결선 */}
                  <div className="scan-connection">
                    <div className="connection-line">
                      <div className="scan-pulse"></div>
                    </div>
                    {currentAnalyzing && (
                      <div className="current-scan-info">
                        <div className="scan-target">{currentAnalyzing.fileName}</div>
                        <div className="scan-arrow">→</div>
                      </div>
                    )}
                  </div>

                  {/* 오른쪽: 압축 해제된 파일들 */}
                  <div className="files-panel">
                    <div className="panel-title">
                      <span>📁 압축 해제된 파일</span>
                      <span className="panel-count">{animationFiles.length}개</span>
                    </div>
                    <div className="files-list">
                      {animationFiles.map((file, index) => (
                        <div 
                          key={index} 
                          className={`file-item ${file.status}`}
                        >
                          <div className="file-icon">📄</div>
                          <div className="file-info">
                            <div className="file-name">{file.name.split('/').pop()}</div>
                            <div className="file-path">{file.name}</div>
                          </div>
                          <div className="file-status-indicator">
                            {file.status === 'ready' && '⚪'}
                            {file.status === 'scanning' && '🔍'}
                            {file.status === 'matched' && '✨'}
                          </div>
                          {file.status === 'scanning' && (
                            <div className="file-scanning-effect"></div>
                          )}
                          {file.status === 'matched' && (
                            <div className="file-match-effect"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 완료 스테이지 */}
            {analysisStep === 'complete' && (
              <div className="analysis-stage">
                <div className="completion-view">
                  <div className={`completion-icon ${overallStatus}`}>
                    {overallStatus === 'success' && '🎉'}
                    {overallStatus === 'warning' && '⚠️'}
                    {overallStatus === 'error' && '❌'}
                  </div>
                  <h4 className="completion-title">
                    {overallStatus === 'success' && '완벽한 매칭!'}
                    {overallStatus === 'warning' && '부분 매칭 완료'}
                    {overallStatus === 'error' && '매칭 문제 발견'}
                  </h4>
                  <div className="completion-message">
                    {overallStatus === 'success' && '모든 첨부파일이 정상적으로 확인되었습니다.'}
                    {overallStatus === 'warning' && '일부 첨부파일을 찾을 수 없습니다.'}
                    {overallStatus === 'error' && '다수의 첨부파일이 누락되었습니다.'}
                  </div>
                  
                  {/* 최종 매칭 결과 요약 */}
                  <div className="final-summary">
                    <div className="summary-stats">
                      <div className="stat-item success">
                        <span className="stat-number">{matchingPairs.filter(p => p.status === 'found').length}</span>
                        <span className="stat-label">매칭 성공</span>
                      </div>
                      <div className="stat-item error">
                        <span className="stat-number">{matchingPairs.filter(p => p.status === 'not-found').length}</span>
                        <span className="stat-label">매칭 실패</span>
                      </div>
                      <div className="stat-item info">
                        <span className="stat-number">{Math.round(matchingPairs.filter(p => p.status === 'found').length / matchingPairs.length * 100)}%</span>
                        <span className="stat-label">정확도</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="integrity-header">
        <button className="back-button" onClick={onClose}>
          <ArrowLeft size={20} />
          돌아가기
        </button>
        <h2>첨부파일 무결성 검사</h2>
        <div className="header-actions">
          <button 
            className="upload-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing || showAnalysisAnimation}
          >
            <Upload size={16} />
            {isProcessing ? '처리 중...' : 'ZIP 파일 업로드'}
          </button>
          <button 
            className="refresh-button"
            onClick={resetAllChecks}
            disabled={showAnalysisAnimation}
          >
            모든 체크 초기화
          </button>
        </div>
      </div>

      {uploadedFiles.length > 0 && !showAnalysisAnimation && (
        <div className="uploaded-files-info">
          <div className="uploaded-files-header">
            <FileArchive size={20} />
            <span>업로드된 파일 ({uploadedFiles.length}개)</span>
          </div>
          <div className="uploaded-files-list">
            {uploadedFiles.map((file, index) => (
              <span key={index} className="uploaded-file-item" title={file.path}>
                {file.name.split('/').pop()}
                {file.path !== file.name && (
                  <span className="file-path"> (경로: {file.path})</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {!showAnalysisAnimation && (
        <>
          <div className="integrity-summary">
            <div className="summary-card">
              <div className="summary-item">
                <span className="summary-label">전체</span>
                <span className="summary-value">{summary.total}</span>
              </div>
              <div className="summary-item exists">
                <CheckCircle size={16} />
                <span className="summary-label">존재함</span>
                <span className="summary-value">{summary.exists}</span>
              </div>
              <div className="summary-item missing">
                <XCircle size={16} />
                <span className="summary-label">없음</span>
                <span className="summary-value">{summary.missing}</span>
              </div>
              <div className="summary-item unchecked">
                <AlertCircle size={16} />
                <span className="summary-label">미확인</span>
                <span className="summary-value">{summary.unchecked}</span>
              </div>
            </div>
          </div>

          <div className="integrity-results">
            {checkResults.length === 0 ? (
              <div className="no-attachments">
                <AlertCircle size={48} />
                <p>검사할 첨부파일이 없습니다.</p>
              </div>
            ) : (
              <div className="results-list">
                {checkResults.map((result, index) => (
                  <div key={index} className={`result-item ${result.status}`}>
                    <div className="result-header">
                      <div className="result-status">
                        {getStatusIcon(result.status)}
                        <span className="status-text">{getStatusText(result.status)}</span>
                        {result.autoChecked && (
                          <span className="auto-check-badge">AI 자동 분석</span>
                        )}
                      </div>
                      <div className="result-location">
                        슬라이드 {result.slideIndex + 1}: {result.slideTitle}
                      </div>
                    </div>
                    
                    <div className="result-content">
                      <div className="attachment-text">
                        <strong>첨부파일:</strong> {result.attachmentText}
                      </div>
                      
                      {result.fileName && (
                        <div className="extracted-filename">
                          <strong>추출된 파일명:</strong> {result.fileName}
                        </div>
                      )}
                      
                      {result.matchedFile && (
                        <div className="matched-file-info">
                          <strong>매칭된 파일:</strong> {result.matchedFile}
                          <span className="match-type-badge">{result.matchType}</span>
                          {result.similarity && (
                            <span className="similarity-badge">
                              유사도: {Math.round(result.similarity * 100)}%
                            </span>
                          )}
                        </div>
                      )}
                      
                      {!result.matchedFile && result.similarFiles && result.similarFiles.length > 0 && (
                        <div className="similar-files-info">
                          <strong>유사한 파일:</strong>
                          <ul className="similar-files-list">
                            {result.similarFiles.map((similar, idx) => (
                              <li key={idx}>
                                {similar.fileName} 
                                <span className="similarity-score">
                                  (유사도: {Math.round(similar.score * 100)}%)
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {result.attachmentUrl && (
                        <div className="attachment-url">
                          <strong>URL:</strong> 
                          <a 
                            href={result.attachmentUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="url-link"
                          >
                            {result.attachmentUrl}
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      )}
                      
                      <div className="check-actions">
                        <span className="check-label">파일 존재 여부를 직접 확인하거나 ZIP 파일을 업로드하세요:</span>
                        <div className="check-buttons">
                          <button 
                            className={`check-btn exists-btn ${result.status === 'exists' ? 'active' : ''}`}
                            onClick={() => handleUserCheck(index, 'exists')}
                          >
                            <CheckCircle size={16} />
                            존재함
                          </button>
                          <button 
                            className={`check-btn missing-btn ${result.status === 'missing' ? 'active' : ''}`}
                            onClick={() => handleUserCheck(index, 'missing')}
                          >
                            <XCircle size={16} />
                            없음
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".zip"
        onChange={handleFileUpload}
      />
    </div>
  );
};

export default AttachmentIntegrityCheck;