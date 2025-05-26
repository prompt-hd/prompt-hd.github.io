import Joyride, { STATUS } from 'react-joyride';

const CustomTooltip = ({ 
  continuous, 
  index, 
  step, 
  backProps, 
  closeProps, 
  primaryProps, 
  tooltipProps, 
  size, 
  skipProps 
}) => (
  <div {...tooltipProps} className="custom-tooltip">
    <div className="tooltip-content">
      <h2 className="tooltip-title">{step.title}</h2>
      
      <div className="tooltip-body">
        {step.content}
      </div>
      
      <div className="tooltip-footer">
        {index > 0 && (
          <button {...backProps} className="tooltip-back-btn">
            이전
          </button>
        )}
        
        {continuous ? (
          <button {...primaryProps} className="tooltip-next-btn">
            {index === size - 1 ? '완료' : '다음'}
          </button>
        ) : (
          <button {...closeProps} className="tooltip-close-btn">
            닫기
          </button>
        )}
      </div>
    </div>
  </div>
);

const Tutorial = ({ 
  runTutorial, 
  tutorialCompleted, 
  handleTutorialComplete 
}) => {
  // Tutorial steps
  const tutorialSteps = [
    {
      target: '.top-navbar',
      content: '상단 네비게이션 바에서 편집 모드 전환, 가져오기/내보내기, 도움말 등의 기능을 사용할 수 있습니다.',
      title: '상단 네비게이션',
      placement: 'bottom',
      disableBeacon: true,
      spotlightClicks: true
    },
    {
      target: '.sidebar',
      content: '사이드바에서는 슬라이드 목차와 외부 도구 링크를 확인할 수 있습니다.',
      title: '사이드바',
      placement: 'right',
      spotlightClicks: true
    },
    {
      target: '.slide-nav',
      content: '탭과 번호를 클릭하여 슬라이드 간 이동이 가능합니다.',
      title: '슬라이드 네비게이션',
      placement: 'bottom',
      spotlightClicks: true
    },
    {
      target: '.prompt-card',
      content: '프롬프트 카드에는 번호와 내용이 표시됩니다. 복사 버튼을 클릭하여 내용을 클립보드에 복사할 수 있습니다.',
      title: '프롬프트 카드',
      placement: 'top',
      spotlightClicks: true
    },
    {
      target: '.tools-section',
      content: '이 섹션에서는 프롬프트와 함께 사용할 수 있는 AI 도구들을 확인할 수 있습니다.',
      title: '사용 도구',
      placement: 'bottom',
      spotlightClicks: true
    },
    {
      target: '.attachments',
      content: '첨부 파일 섹션에는 추가 정보나 관련 링크가 포함되어 있습니다.',
      title: '첨부 파일',
      placement: 'top',
      spotlightClicks: true
    },
    {
      target: '.edit-button',
      content: '편집 모드를 활성화하면 프롬프트, 첨부 파일, 슬라이드를 추가, 수정, 삭제할 수 있습니다.',
      title: '편집 모드',
      placement: 'bottom',
      spotlightClicks: true
    }
  ];

  // Handle tutorial completion
  const handleJoyrideCallback = (data) => {
    const { status } = data;
    
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      handleTutorialComplete();
    }
  };

  return (
    <Joyride
      steps={tutorialSteps}
      run={runTutorial && !tutorialCompleted}
      continuous
      showSkipButton
      showProgress
      disableScrolling={false}
      tooltipComponent={CustomTooltip}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          arrowColor: '#fff',
          backgroundColor: '#fff',
          primaryColor: '#3b82f6',
          textColor: '#333',
          zIndex: 1000,
        }
      }}
    />
  );
};

export default Tutorial;