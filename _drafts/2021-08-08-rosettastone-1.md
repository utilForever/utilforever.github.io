---
layout: post
title: RosettaStone 개발 일지 1 - 몇 가지 버그 수정
---

평소 블로그에 연말 회고를 제외하고는 글을 잘 쓰지 않았는데, 최근에 이직 관련 글을 올리면서 개발 일지도 써보면 좋을 거 같아 시작해보려고 한다.

[RosettaStone](https://github.com/utilForever/RosettaStone)은 블리자드에서 서비스하는 게임 [하스스톤](https://playhearthstone.com/)의 시뮬레이터를 만드는 프로젝트이며 나아가 강화학습을 통해 프로게이머 수준으로 플레이하는 에이전트를 만드는 걸 목표로 하고 있다. 2017년 5월부터 개발을 시작했으며 4년이 지난 현재도 신규 확장팩에 등장하는 새로운 키워드 및 카드들을 구현하며 활발하게 개발중이다.

![rosettastone](https://github.com/utilForever/utilforever.github.io/blob/master/assets/img/rosettastone-1/rosettastone.png?raw=true)

첫번째 개발 일지로 무엇을 쓸까 고민하다가 최근에 몇 가지 버그를 고쳤던 이야기를 해보려고 한다.

## 살아있는 씨앗 (1 레벨)

## 요그사론의 수수께끼 상자

## 상점가 털기

## 사냥감 공격

## 뱀 덫

위 카드들은 여러 PR([#610](https://github.com/utilForever/RosettaStone/pull/610), [#614](https://github.com/utilForever/RosettaStone/pull/614), [#621](https://github.com/utilForever/RosettaStone/pull/621))을 통해 수정되었다. 각 카드로 인해 발생할 수 있는 다양한 경우를 미리 테스트 코드로 작성해 뒀기에 발견할 수 있었으며 앞으로도 카드를 구현할 때마다 여러 상황을 고려해 개발하고 테스트 코드도 만들 예정이다.

한편, RosettaStone 2.0 작업을 준비하고 있다. 최근 ECS(Entity-Component System)에 관심을 갖게 되었는데 강화학습과 상당히 잘 어울린다는 생각이 들어 OOP 기반으로 되어 있는 코드를 바꿔볼 생각이다. 이에 대한 자세한 이야기는 다른 글을 통해서 다뤄보도록 하겠다. 이외에 할 일 목록으로 Logger 클래스 추가, 하스스톤: 전장 재작업, 콘솔/GUI 프로그램 재작업, 강화학습 기반 코드 재작업 등을 생각하고 있다. 아직 작업을 시작하진 않았고 여유가 있을 때 조금씩 하려고 한다. (C++로 할 지, Rust로 할 지 고민중이다. 물론 둘 다 할 수도 있다.)

첫번째 개발 일지는 여기서 마무리하려고 한다. 앞으로도 기록을 남겨야 할 작업이 있을 때마다 정리해서 공유할 수 있도록 하겠다. 여기까지 열심히 읽어주신 모든 분들께 감사드린다.