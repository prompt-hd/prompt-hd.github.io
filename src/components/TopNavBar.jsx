import { useState, useEffect } from 'react';
import { Home, Edit, Upload, Download, HelpCircle, Menu, Hash, FileText, Shield } from 'lucide-react';
import { exportDataToJson } from '../utils/helpers';

const TopNavBar = ({ 
  toggleEditMode, 
  isEditMode, 
  fileInputRef, 
  restartTutorial,
  toggleSidebar,
  isSidebarOpen,
  setShowAuthCenter,
  setShowIntegrityCheck
}) => {
  const [title, setTitle] = useState('프롬프트 관리자');
  
  // Handle top navigation actions
  const handleTopNavigation = (action) => {
    switch (action) {
      case 'edit':
        toggleEditMode();
        break;
      case 'import':
        fileInputRef.current?.click();
        break;
      case 'export':
        // Export handler needs promptData from parent
        const storedData = localStorage.getItem('promptAppData');
        if (storedData) {
          try {
            const parsedData = JSON.parse(storedData);
            if (parsedData.slides && Array.isArray(parsedData.slides)) {
              exportDataToJson(parsedData);
            } else {
              alert('내보낼 유효한 데이터가 없습니다.');
            }
          } catch (error) {
            alert('데이터 내보내기 오류: ' + error.message);
          }
        } else {
          alert('내보낼 데이터가 없습니다.');
        }
        break;
      case 'help':
        restartTutorial();
        break;
      case 'auth':
        setShowAuthCenter(true);
        break;
      case 'download':
        window.open('https://drive.google.com/drive/folders/1-3nfS3TG7vrOqxP1C1yDJSqoUNYJGhCm', '_blank');
        break;
      case 'integrity':
        setShowIntegrityCheck(true);
        break;
      default:
        break;
    }
  };

  return (
    <div className="top-navbar">
      <div className="navbar-left">
        <button 
          className="mobile-sidebar-toggle"
          onClick={toggleSidebar}
          aria-label="Toggle Sidebar"
        >
          <Menu size={20} />
        </button>
        
        <button 
          className="home-button" 
          onClick={() => window.location.reload()}
          aria-label="Home"
        >
          <Home size={24} />
        </button>
        <h1 className="app-title">{title}</h1>
      </div>
      
      <div className="navbar-right">
        <button 
          className="nav-button auth-button"
          onClick={() => handleTopNavigation('auth')}
          aria-label="ChatGPT Auth"
        >
          <Hash size={20} />
          <span>챗GPT 인증번호 확인</span>
        </button>
        
        <button 
          className="nav-button download-button"
          onClick={() => handleTopNavigation('download')}
          aria-label="Download Files"
        >
          <FileText size={20} />
          <span>실습파일 다운로드</span>
        </button>
        
        <button 
          className="nav-button integrity-button"
          onClick={() => handleTopNavigation('integrity')}
          aria-label="Attachment Integrity Check"
        >
          <Shield size={20} />
          <span>첨부파일 무결성 체크</span>
        </button>
        
        <button 
          className="nav-button edit-button"
          onClick={() => handleTopNavigation('edit')}
          aria-label={isEditMode ? "View Mode" : "Edit Mode"}
        >
          <Edit size={20} />
          <span>{isEditMode ? '보기 모드' : '편집 모드'}</span>
        </button>
        
        <button 
          className="nav-button import-button"
          onClick={() => handleTopNavigation('import')}
          aria-label="Import"
        >
          <Upload size={20} />
          <span>가져오기</span>
        </button>
        
        <button 
          className="nav-button export-button"
          onClick={() => handleTopNavigation('export')}
          aria-label="Export"
        >
          <Download size={20} />
          <span>내보내기</span>
        </button>
        
        <button 
          className="nav-button help-button"
          onClick={() => handleTopNavigation('help')}
          aria-label="Help"
        >
          <HelpCircle size={20} />
          <span>도움말</span>
        </button>
      </div>
    </div>
  );
};

export default TopNavBar;