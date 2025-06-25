= 约定

节点必须包括
- node_id
- node_type
- node_iden
- private
- public

其中 public 和 private 为节点值。

= 节点类型

== Problem Related Node

=== Problem Node

*Private*

- content: private 的 content

*Public*

- content: public 的 content
- name: 题目标题
- creation_time: 题目创建时间
- creation_order: 题目创建顺序

题目节点与题目直接相关。

== Problem Iden Node

*Private*

- description: 对题目标识的解释。

*Public*

- iden: 题目标识（例如 1001A）


== Problem Source Node

*Private*

- copyright: 是否存在版权风险

*Public*

- iden: 传递的题目标题（例如:CF, LGP）
- name: 题库名称

== Algorithm Node

*Private*

*Public*

- iden: 算法 iden。
- name: 算法名称。(i18n ?)

== Data Node

*Private*

*Public*

- iden: 数据id

若题目拥有数据，数据点对应的 node_id 拥有全局唯一id。


== Event

=== Event Node

*Private*

*Public*

- iden: 事件标识
- name: 事件名称
- start_time: 事件开始时间
- end_time: 事件结束时间
- description: 事件描述

