# WSE Survivors 전투 테스트 버전

계획서의 0~3단계 구현입니다. 1~2명이 초대 코드로 같은 방에 들어가고, 대기실에서 각자 캐릭터를 선택합니다. 방장은 맵과 난이도를 고르고 혼자 또는 함께 전투를 시작할 수 있습니다. 캐릭터별 체력·이동 속도·공격력, 난이도별 몬스터 체력·속도·피해·생성 주기가 서버 전투에 반영됩니다. WASD/방향키로 이동하며 가장 가까운 몬스터에게 자동 발사합니다. 몬스터는 플레이어를 추적하고 접촉 피해를 입히며, 처치하면 경험치 보석을 남깁니다. 모든 플레이어가 쓰러지면 패배합니다. 레벨업·보스·승리 조건은 아직 없습니다.

Node.js 22 이상에서 `npm install` 후 `npm run dev`를 실행하고 http://localhost:5173 을 엽니다. 첫 창에서 방을 만들고 다른 창에서 코드로 참가한 뒤 방장이 시작 버튼을 누릅니다. 혼자서도 시작할 수 있습니다. 서버 health check는 http://localhost:2567/health 입니다.

- `npm run typecheck`: 전체 타입 검사
- `npm run build`: 전체 프로덕션 빌드
- `npm test`: 서버 이동·중복 처치·경험치 단위 테스트
- `npm run dev:client`, `npm run dev:server`: 개별 실행

환경 변수 예시는 각 앱의 `.env.example`을 참고하세요. React/Vite/TypeScript는 UI와 빌드, Phaser 4는 게임 캔버스, Colyseus 및 SDK/Schema는 방 동기화, tsx는 서버 개발 실행, concurrently는 동시 실행, dotenv는 환경 변수 로드에 사용합니다. 클라이언트는 이동 방향만 보내고 좌표·체력·공격·경험치는 서버가 결정합니다.
