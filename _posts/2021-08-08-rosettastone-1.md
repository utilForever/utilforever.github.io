---
layout: post
title: RosettaStone 개발 일지 1 - 몇 가지 버그 수정
---

# 들어가며

평소 블로그에 연말 회고를 제외하고는 글을 잘 쓰지 않았는데, 최근에 이직 관련 글을 올리면서 개발 일지도 써보면 좋을 거 같아 시작해보려고 한다.

[RosettaStone](https://github.com/utilForever/RosettaStone)은 블리자드에서 서비스하는 게임 [하스스톤](https://playhearthstone.com/)의 시뮬레이터를 만드는 프로젝트이며 나아가 강화학습을 통해 프로게이머 수준으로 플레이하는 에이전트를 만드는 걸 목표로 하고 있다. 2017년 5월부터 개발을 시작했으며 4년이 지난 현재도 신규 확장팩에 등장하는 새로운 키워드 및 카드들을 구현하며 활발하게 개발중이다.

![rosettastone](https://github.com/utilForever/utilforever.github.io/blob/master/assets/img/rosettastone-1/rosettastone.png?raw=true)

첫번째 개발 일지로 무엇을 쓸까 고민하다가 최근에 몇 가지 버그를 고쳤던 이야기를 해보려고 한다.

## 살아있는 씨앗 (1 레벨)

![living_seed](https://static.wikia.nocookie.net/hearthstone_gamepedia/images/0/0f/Living_Seed_%28Rank_1%29%28487654%29_Gold.png)

`살아있는 씨앗 (1 레벨)`은 `야수를 뽑습니다. 그 야수의 비용이 (1) 감소합니다. (보유한 마나가 5일때 강화됩니다.)`라는 효과를 갖는 카드다. 최근에 확장팩 '불모의 땅' 카드들을 구현하면서 같이 작업한 카드인데, 이 카드는 보유한 마나가 특정 값이 될 때 레벨이 증가하는 카드라 기존에 없던 방식이었다. 그래서 마나가 증가할 때 동작하는 트리거를 구현했었다.

```C++
{
    ...

    // Process mana crystal trigger
    game->triggerManager.OnManaCrystalTrigger(this);
}
```

그런데 밑에 있는 `요그사론의 수수께끼 상자` 카드를 테스트하던 도중 매우 드문 확률로 문제가 생긴다는 사실을 알게 되었다. 디버깅한 결과 `요그사론의 수수께끼 상자` 카드를 시전하는 도중 보유한 마나를 증가시키는 주문 카드를 시전하고 나면 이 카드가 강화되어야 하는데 강화가 되지 않아 다른 주문 카드를 시전할 때 크래시가 발생하고 있었다. 단순히 트리거만 동작시킬 게 아니라 관련된 태스크들을 처리하고 갱신해줘야 했는데 처리하는 코드를 누락해서 생긴 문제였다. 원인을 파악했으니 다음과 같이 코드를 수정해 문제를 해결했다.

```C++
{
    ...

    // Process mana crystal trigger
    game->taskQueue.StartEvent();
    game->triggerManager.OnManaCrystalTrigger(this);
    game->ProcessTasks();
    game->taskQueue.EndEvent();
    game->ProcessDestroyAndUpdateAura();
}
```

## 요그사론의 수수께끼 상자

![yogg](https://static.wikia.nocookie.net/hearthstone_gamepedia/images/e/ee/Puzzle_Box_of_Yogg-Saron%2890692%29_Gold.png)

플레이어의 관점에서 보는 `요그사론의 수수께끼 상자`는 하스스톤이 갖는 '무작위성'을 가장 잘 보여주는 카드다. 임의의 주문을 시전하는데 대상도 무작위라 사용했을 때 시전된 주문에 따라 한 순간에 판세가 뒤바뀔 수 있는 반전의 카드라고 볼 수 있다.

개발자의 관점에서 보면 어떨까? 하나씩 구현한 주문 카드들의 순서에 따라 올바르게 잘 동작하는지 테스트해 볼 수 있는 멋진 교보재와 같은 카드다. 이 카드 덕분에 버그를 발견할 수 있고, 원인을 파악해 고칠 수도 있다. 그래서 이 카드의 테스트 횟수는 적으면 100번, 많게는 10,000번 정도다.

그러다 보니 다른 카드들을 구현하다 보면 매우 드문 확률로 크래시가 발생할 때가 있다. 이전에 문제가 발생해 고쳤던 적이 있는데 확장팩 '불모의 땅' 카드들을 구현하면서 문제가 재발했다. 무엇이 문제였을까? 디버깅을 해보니 원인은 2가지였다.

1. 하수인 카드를 드로우하는 `DrawMinionTask` 로직은 다음과 같다.

```C++
TaskStatus DrawMinionTask::Impl(Player* player)
{
    if (m_addToStack)
    {
        player->game->taskStack.playables.clear();
    }

    auto deckCards = player->GetDeckZone()->GetAll();
    if (deckCards.empty())
    {
        return TaskStatus::STOP;
    }

    EraseIf(deckCards, [=](Playable* playable) {
        return playable->card->GetCardType() != CardType::MINION;
    });

    ...
}
```

`DrawMinionTask`이 하는 일은 덱에 있는 하수인 카드 중 원하는 수만큼 임의로 뽑는 것이다. 하지만 코드를 보면 뭔가 문제가 있음을 알 수 있다. 지금은 덱에 있는 카드 목록을 가져와 먼저 덱이 비었는지를 확인한 뒤 하수인 카드만 남도록 필터링하고 있다. 하지만 덱에 주문 카드만 있다면, 덱이 빈 상태가 아니니 `if`문을 통과하게 되고 하수인 카드만 남도록 필터링하면 아무 카드도 남지 않게 된다. 이 상태에서 하수인 카드를 뽑으려고 시도하니 문제가 발생한 것이었다. 따라서 덱이 빈 상태를 확인하는 코드를 하수인 카드만 남도록 필터링한 다음 확인하도록 수정했다.

```C++
TaskStatus DrawMinionTask::Impl(Player* player)
{
    if (m_addToStack)
    {
        player->game->taskStack.playables.clear();
    }

    auto deckCards = player->GetDeckZone()->GetAll();

    EraseIf(deckCards, [=](Playable* playable) {
        return playable->card->GetCardType() != CardType::MINION;
    });

    if (deckCards.empty())
    {
        return TaskStatus::STOP;
    }

    ...
}
```

2. `지옥영혼 간수`라고 하는 하수인 카드가 있다.

![felsoul_jailer](https://static.wikia.nocookie.net/hearthstone_gamepedia/images/8/8e/Felsoul_Jailer%28463938%29_Gold.png)

이 하수인의 카드 효과는 다음과 같이 구현되어 있다.

```C++
// --------------------------------------- MINION - WARLOCK
// [CS3_003] Felsoul Jailer - COST:5 [ATK:4/HP:6]
// - Race: Demon, Set: CORE, Rarity: Epic
// --------------------------------------------------------
// Text: <b>Battlecry:</b> Your opponent discards a minion.
//       <b>Deathrattle:</b> Return it.
// --------------------------------------------------------
// GameTag:
// - BATTLECRY = 1
// - DEATHRATTLE = 1
// --------------------------------------------------------
power.ClearData();
power.AddPowerTask(
    std::make_shared<DiscardTask>(1, DiscardType::ENEMY_MINION, true));
power.AddDeathrattleTask(std::make_shared<CustomTask>(
    [](Player* player, Entity* source, [[maybe_unused]] Playable* target) {
        const int entityID =
            source->GetGameTag(GameTag::TAG_SCRIPT_DATA_ENT_1);
        Playable* playable = player->game->entityList[entityID];
        player->opponent->GetGraveyardZone()->Remove(playable);
        player->opponent->GetHandZone()->Add(playable);
    }));
cards.emplace("CS3_003", CardDef(power));
```

이 카드는 `전투의 함성: 상대편은 하수인을 버립니다. 죽음의 메아리: 그 하수인을 상대편의 손으로 다시 돌려보냅니다.`라는 효과를 갖고 있다. 문제는 `죽음의 메아리` 효과에 있었다. `요그사론의 수수께끼 상자` 카드가 주문을 시전하던 도중 비용이 5인 무작위 하수인을 소환하는 주문으로 인해 `지옥영혼 간수`가 소환되었고, 이후 다른 주문으로 인해 이 하수인이 죽게 되었다고 가정해 보자. `죽음의 메아리` 효과로 인해 하수인을 상대편의 손으로 다시 돌려보내야 하는데 주문으로 인해 소환된 하수인이라 `전투의 함성` 효과를 발동하지 않았기 때문에 돌려보낼 하수인이 없는 상태다. 때문에 '죽음의 메아리' 효과를 처리하는 과정에서 문제가 생겨 크래시가 발생했던 것이다. 따라서 `전투의 함성` 효과를 발동했는지에 따라 `죽음의 메아리` 효과를 발동하도록 코드를 수정했다.

```C++
// --------------------------------------- MINION - WARLOCK
// [CS3_003] Felsoul Jailer - COST:5 [ATK:4/HP:6]
// - Race: Demon, Set: CORE, Rarity: Epic
// --------------------------------------------------------
// Text: <b>Battlecry:</b> Your opponent discards a minion.
//       <b>Deathrattle:</b> Return it.
// --------------------------------------------------------
// GameTag:
// - BATTLECRY = 1
// - DEATHRATTLE = 1
// --------------------------------------------------------
power.ClearData();
power.AddPowerTask(
    std::make_shared<DiscardTask>(1, DiscardType::ENEMY_MINION, true));
power.AddDeathrattleTask(std::make_shared<CustomTask>(
    [](Player* player, Entity* source, [[maybe_unused]] Playable* target) {
        const int entityID =
            source->GetGameTag(GameTag::TAG_SCRIPT_DATA_ENT_1);
        if (entityID > 0)
        {
            Playable* playable = player->game->entityList[entityID];
            player->opponent->GetGraveyardZone()->Remove(playable);
            player->opponent->GetHandZone()->Add(playable);
        }
    }));
cards.emplace("CS3_003", CardDef(power));
```

## 상점가 털기

![bazaar_burglary](https://static.wikia.nocookie.net/hearthstone_gamepedia/images/a/a9/Bazaar_Burglary%2890798%29_Gold.png)

`상점가 털기`는 `퀘스트: 다른 직업의 카드 4장을 내 손으로 가져와야 합니다. 보상: 고대의 검`라는 효과를 갖는 카드다. 이 카드를 구현할 당시에는 문제가 없었는데 언젠가부터 가끔 크래시가 발생하는 문제가 있었다. 그래서 왜 크래시가 발생하는 것인지 원인을 찾아보기 시작했고, 디버깅을 통해 분석한 결과 문제는 전혀 다른 곳에 있었다.

`상점가 털기`의 카드 효과를 테스트하기 위한 코드 중에는 하수인 카드인 `상점가 약탈자`를 손에서 내는 부분이 있다.

![bazzar_mugger](https://static.wikia.nocookie.net/hearthstone_gamepedia/images/0/0f/Bazaar_Mugger%2890733%29_Gold.png)

`상점가 약탈자`는 `속공, 전투의 함성: 다른 직업의 무작위 하수인을 내 손으로 가져옵니다.`라는 효과를 갖는 카드다. 이 카드를 통해 `상점가 털기`의 퀘스트를 완료할 수 있기 때문에 테스트 코드에 사용했었다. 이 카드의 효과로 인해 다양한 무작위 하수인을 손으로 가져오게 되는데 그 중에는 `타락` 키워드가 있는 하수인들도 있다.

![fairground_fool](https://static.wikia.nocookie.net/hearthstone_gamepedia/images/2/2c/Fairground_Fool%28388997%29_Gold.png)

`타락` 키워드는 더 높은 비용의 카드를 낸 후에 손에서 강화되는 효과를 갖는다. 하스스톤 카드 데이터에는 `타락`되었을 때 강화된 카드를 알 수 있는 방법이 없기 때문에 수동으로 추가해줘야 한다. 문제는 여기에 있었다. `타락` 키워드가 있는 카드 중 구현한 카드는 문제가 없는데 구현하지 않은 카드는 강화된 카드가 무엇인지 지정하지 않았기 때문에 `타락` 키워드를 처리하는 로직에서 문제가 발생했다.

```C++
// Process keyword 'Corrupt'
for (auto& playable : player->GetHandZone()->GetAll())
{
    if (playable->HasCorrupt() && source->GetCost() > playable->GetCost())
    {
        Card* newCard = Cards::FindCardByDbfID(
            playable->GetGameTag(GameTag::CORRUPTEDCARD));
        if (newCard != nullptr)
        {
            ChangeEntity(player, playable, newCard, true);
        }
    }
}
```

따라서 구현하지 않은 카드를 위해 방어 코드를 추가하는 걸로 마무리햇다.

```C++
// Process keyword 'Corrupt'
for (auto& playable : player->GetHandZone()->GetAll())
{
    if (playable->HasCorrupt() && source->GetCost() > playable->GetCost())
    {
        Card* newCard = Cards::FindCardByDbfID(
            playable->GetGameTag(GameTag::CORRUPTEDCARD));
        if (newCard != nullptr && !newCard->name.empty())
        {
            ChangeEntity(player, playable, newCard, true);
        }
    }
}
```

## 뱀 덫

![snake_trap](https://static.wikia.nocookie.net/hearthstone_gamepedia/images/0/02/Snake_Trap%28210%29_Gold.png)

`뱀 덫`은 `비밀: 내 하수인이 공격받으면, 1/1 뱀을 3마리 소환합니다.`라는 효과를 갖는 카드다. 최근 이 카드와 비슷한 효과를 갖는 `오아시스 아군`이라는 카드를 확장팩 '불모의 땅'을 작업하면서 구현했었다.

![oasis_ally](https://static.wikia.nocookie.net/hearthstone_gamepedia/images/7/7f/Oasis_Ally%28464294%29_Gold.png)

`오아시스 아군`은 `비밀: 내 하수인이 공격받으면, 3/6 물의 정령을 소환합니다.`라는 효과를 갖는 카드다. 두 카드 모두 발동 조건이 똑같다. `내 하수인이 공격받으면` 발동하는 카드다. 근데 여기서 주의할 점이 있다. 하스스톤의 카드 중에는 텍스트만으로는 알 수 없는 규칙들이 존재한다. 대표적으로 `뱀 덫`과 `오아시스 아군`이라는 카드가 그렇다. 두 카드의 발동 조건인 `내 하수인이 공격받으면`은 내 전장이 하수인으로 꽉 차있을 경우에는 발동 조건을 충족하더라도 발동하지 않는다. 이번에 `오아시스 아군` 카드를 구현하면서 `뱀 덫` 카드를 구현할 때 이 부분을 누락했던 사실을 발견했다.

```C++
// ----------------------------------------- SPELL - HUNTER
// [EX1_554] Snake Trap - COST:2
// - Faction: Neutral, Set: Expert1, Rarity: Epic
// --------------------------------------------------------
// Text: <b>Secret:</b> When one of your minions is attacked,
//       summon three 1/1 Snakes.
// --------------------------------------------------------
// GameTag:
// - SECRET = 1
// --------------------------------------------------------
power.ClearData();
power.AddTrigger(std::make_shared<Trigger>(TriggerType::ATTACK));
power.GetTrigger()->triggerSource = TriggerSource::ENEMY;
power.GetTrigger()->condition = std::make_shared<SelfCondition>(
    SelfCondition::IsProposedDefender(CardType::MINION));
power.GetTrigger()->tasks = ComplexTask::ActivateSecret(
    TaskList{ std::make_shared<SummonTask>("EX1_554t", 3) });
cards.emplace("EX1_554", CardDef(power));
```

그래서 트리거의 발동 조건에 내 전장이 하수인으로 꽉 차있지 않아야 한다는 조건을 추가하고 싶었다. 현재 구조는 트리거의 발동 조건을 하나만 지정할 수 있게 되어 있다. 따라서 이 부분을 고쳐서 발동 조건을 여러 개 추가할 수 있도록 수정하기 시작했다. 우선 `Trigger` 클래스의 변수 `condition`의 타입을 변경했다.

```C++
class Trigger
{
    ...
    std::vector<std::shared_ptr<SelfCondition>> conditions;
};
```

그리고 관련 코드를 전부 변경했다.

```C++
//! Trigger for enrage.
//! \param enchantmentID The card ID of enchantment.
static Trigger EnrageTrigger(std::string&& enchantmentID)
{
    Trigger trigger(TriggerType::PREDAMAGE);
    trigger.triggerSource = TriggerSource::SELF;
    trigger.conditions = SelfCondList{ std::make_shared<SelfCondition>(
        SelfCondition::IsUndamaged()) };
    trigger.tasks = { std::make_shared<SimpleTasks::AddEnchantmentTask>(
        std::move(enchantmentID), EntityType::SOURCE) };

    return trigger;
}
```

이어서 내 전장이 하수인으로 꽉 차있지 않아야 한다는 조건을 확인하기 위한 메소드를 하나 추가했다.

```C++
//! SelfCondition wrapper for checking the field of event target
//! is not full.
//! \param cardType The type of the card to check.
//! \return Generated SelfCondition for intended purpose.
static SelfCondition IsEventTargetFieldNotFull()
{
    return SelfCondition([](Playable* playable) {
        if (const auto eventData = playable->game->currentEventData.get();
            eventData)
        {
            return !eventData->eventTarget->player->GetFieldZone()->IsFull();
        }

        return false;
    });
}
```

위에서 추가한 메소드를 사용해 `뱀 덫`의 카드 로직을 수정했다.

```C++
// ----------------------------------------- SPELL - HUNTER
// [EX1_554] Snake Trap - COST:2
// - Faction: Neutral, Set: Expert1, Rarity: Epic
// --------------------------------------------------------
// Text: <b>Secret:</b> When one of your minions is attacked,
//       summon three 1/1 Snakes.
// --------------------------------------------------------
// GameTag:
// - SECRET = 1
// --------------------------------------------------------
power.ClearData();
power.AddTrigger(std::make_shared<Trigger>(TriggerType::ATTACK));
power.GetTrigger()->triggerSource = TriggerSource::ENEMY;
power.GetTrigger()->conditions =
    SelfCondList{ std::make_shared<SelfCondition>(
                        SelfCondition::IsProposedDefender(CardType::MINION)),
                    std::make_shared<SelfCondition>(
                        SelfCondition::IsEventTargetFieldNotFull()) };
power.GetTrigger()->tasks = ComplexTask::ActivateSecret(
    TaskList{ std::make_shared<SummonTask>("EX1_554t", 3) });
cards.emplace("EX1_554", CardDef(power));
```

마지막으로 내 전장이 하수인으로 꽉 찬 상태일 때 비밀이 발동하지 않는지 확인하는 테스트 코드를 추가했다.

```C++
// ----------------------------------------- SPELL - HUNTER
// [EX1_554] Snake Trap - COST:2
// - Faction: Neutral, Set: Expert1, Rarity: Epic
// --------------------------------------------------------
// Text: <b>Secret:</b> When one of your minions is attacked,
//       summon three 1/1 Snakes.
// --------------------------------------------------------
// GameTag:
// - SECRET = 1
// --------------------------------------------------------
TEST_CASE("[Hunter : Spell] - EX1_554 : Snake Trap")
{
    ...
    
    const auto card7 =
        Generic::DrawCard(curPlayer, Cards::FindCardByName("Wisp"));
    const auto card8 =
        Generic::DrawCard(curPlayer, Cards::FindCardByName("Wisp"));
    const auto card9 =
        Generic::DrawCard(curPlayer, Cards::FindCardByName("Wisp"));

    ...

    game.Process(curPlayer, AttackTask(card4, card5));
    CHECK_EQ(curSecret->GetCount(), 1);
    CHECK_EQ(curField.GetCount(), 4);
    CHECK_EQ(opField.GetCount(), 1);

    game.Process(curPlayer, PlayCardTask::Minion(card7));
    game.Process(curPlayer, PlayCardTask::Minion(card8));
    game.Process(curPlayer, PlayCardTask::Minion(card9));
    CHECK_EQ(curField.GetCount(), 7);

    game.Process(curPlayer, EndTurnTask());
    game.ProcessUntil(Step::MAIN_ACTION);

    game.Process(opPlayer, AttackTask(card5, curField[6]));
    CHECK_EQ(curSecret->GetCount(), 1);
    CHECK_EQ(curField.GetCount(), 6);
}
```

# 마치며

위 카드들은 여러 PR([#610](https://github.com/utilForever/RosettaStone/pull/610), [#614](https://github.com/utilForever/RosettaStone/pull/614), [#621](https://github.com/utilForever/RosettaStone/pull/621))을 통해 수정되었다. 각 카드로 인해 발생할 수 있는 다양한 경우를 미리 테스트 코드로 작성해 뒀기에 발견할 수 있었으며 앞으로도 카드를 구현할 때마다 여러 상황을 고려해 개발하고 테스트 코드도 만들 예정이다.

한편, RosettaStone 2.0 작업을 준비하고 있다. 최근 ECS(Entity-Component System)에 관심을 갖게 되었는데 강화학습과 상당히 잘 어울린다는 생각이 들어 OOP 기반으로 되어 있는 코드를 바꿔볼 생각이다. 이에 대한 자세한 이야기는 다른 글을 통해서 다뤄보도록 하겠다. 이외에 할 일 목록으로 Logger 클래스 추가, 하스스톤: 전장 재작업, 콘솔/GUI 프로그램 재작업, 강화학습 기반 코드 재작업 등을 생각하고 있다. 아직 작업을 시작하진 않았고 여유가 있을 때 조금씩 하려고 한다. (C++로 할 지, Rust로 할 지 고민중이다. 물론 둘 다 할 수도 있다.)

첫번째 개발 일지는 여기서 마무리하려고 한다. 앞으로도 기록을 남겨야 할 작업이 있을 때마다 정리해서 공유할 수 있도록 하겠다. 여기까지 열심히 읽어주신 모든 분들께 감사드린다.