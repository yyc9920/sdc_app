import React, { useState } from 'react';
import { Youtube, Copy, Check, MessageSquare } from 'lucide-react';

export const YouTubePromptGenerator: React.FC = () => {
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const generatePrompt = (youtubeUrl: string) => {
    return `
다음 YouTube 영상의 내용을 바탕으로 영어 학습용 CSV 데이터를 생성해줘.
영상 URL: ${youtubeUrl}

[요구사항]
1. 영상에서 소개된 주요 영어 표현들을 추출해줘.
2. 결과는 반드시 아래의 4개 컬럼을 가진 CSV 형식으로 제공해줘.
3. 첫 번째 줄은 반드시 헤더(English Sentence,Korean Pronounce,Direct Comprehension,Comprehension)를 포함해야 해.
4. 각 컬럼의 정의:
   - English Sentence: 원문 영어 문장
   - Korean Pronounce: 영어 문장의 한글 발음 (예: "I'm here to check in" -> "아임 히어 투 체크 인")
   - Direct Comprehension: 직독직해 (문장 성분별 끊어 읽기 및 의미, 예: "나는 여기 있다 / 체크인을 하기 위해")
   - Comprehension: 자연스러운 한국어 번역 (예: "체크인하러 왔습니다.")

[CSV 포맷 예시]
English Sentence,Korean Pronounce,Direct Comprehension,Comprehension
Can I help you check in?,캔 아이 헬프 유 체크 인,도와드릴까요 / 당신 / 체크인을,체크인 도와드릴까요?
I'm here to check in.,아임 히어 투 체크 인,나는 여기 있다 / 체크인을 하기 위해,체크인하러 왔습니다.

[주의사항]
- 텍스트만 출력하고 다른 설명은 하지 마.
- 만약 영상의 자막이나 스크립트를 직접 제공받지 못한다면, 해당 영상의 제목과 설명을 바탕으로 예상되는 핵심 표현 10~20개를 생성해줘.
    `.trim();
  };

  const handleCopy = () => {
    const prompt = generatePrompt(url);
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-xl">
          <Youtube className="w-5 h-5 text-red-600 dark:text-red-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI 프롬프트 생성기</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              YouTube 영상 URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          <button
            onClick={handleCopy}
            disabled={!url}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all ${
              url 
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-5 h-5" />
                복사 완료!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                프롬프트 복사하기
              </>
            )}
          </button>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800/30">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200 mb-2">사용 방법 가이드</h4>
              <ol className="text-xs text-blue-800 dark:text-blue-300 space-y-2 list-decimal ml-4">
                <li>학습 자료로 만들고 싶은 <b>YouTube 영상 URL</b>을 입력합니다.</li>
                <li><b>'프롬프트 복사하기'</b> 버튼을 클릭합니다.</li>
                <li><b>ChatGPT, Claude, Gemini</b> 등 생성형 AI 서비스에 접속합니다.</li>
                <li>복사한 프롬프트를 붙여넣고 전송합니다.</li>
                <li>AI가 생성한 CSV 텍스트를 복사하여 <b>.csv 파일</b>로 저장합니다.</li>
                <li>저장한 파일을 <b>'CSV 업로드 관리'</b> 메뉴를 통해 앱에 업로드합니다.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
